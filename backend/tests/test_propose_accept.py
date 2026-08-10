"""Propose->accept agent assignment (#10): an agent is only PROPOSED at
order creation - they gain no access to the order until the customer
explicitly accepts. Covers the three things that can break this: the
exclude-list on "see another", agent visibility before acceptance, and
reassignment being blocked once shopping has started.
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

CUST_PHONE = "+2348060000001"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    body = {"phone": phone, "code": code}
    if role:
        body["role"] = role
    r = await client.post("/auth/verify-otp", json=body)
    return r.json()["access_token"]


async def _make_agent(client, db_session_factory, phone, market_id):
    from app.auth.models import User
    from app.core.enums import UserRole
    from app.markets.models import Agent

    token = await _login(client, phone, role="agent")
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.phone == phone))).scalar_one()
        assert user.role is UserRole.AGENT
        s.add(Agent(user_id=user.id, assigned_market_id=market_id, is_available=True))
        await s.commit()
        agent_id = user.id
    return token, agent_id


@pytest.mark.asyncio
async def test_see_another_excludes_previously_rejected_agents(client, db_session_factory):
    """Three agents cover one market. Reject the first two via 'see
    another' and confirm each rejection produces a genuinely NEW candidate,
    never repeating one already turned down - then confirm the fourth
    rejection (nobody left) correctly reports "none"."""
    market_id = uuid.uuid4()
    a_token, a_id = await _make_agent(client, db_session_factory, "+2348060000010", market_id)
    b_token, b_id = await _make_agent(client, db_session_factory, "+2348060000011", market_id)
    c_token, c_id = await _make_agent(client, db_session_factory, "+2348060000012", market_id)

    cust_token = await _login(client, CUST_PHONE)
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    assert r.status_code == 201, r.text
    oid = r.json()["id"]
    first_proposed = r.json()["proposed_agent_id"]
    assert first_proposed in {str(a_id), str(b_id), str(c_id)}

    seen = {first_proposed}

    # Reject #1 -> a genuinely different agent, never one already seen.
    r = await client.post(f"/orders/{oid}/see-another-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outcome"] == "proposed"
    second_proposed = body["order"]["proposed_agent_id"]
    assert second_proposed not in seen, "must not re-propose an already-rejected agent"
    seen.add(second_proposed)

    # Reject #2 -> the last remaining candidate.
    r = await client.post(f"/orders/{oid}/see-another-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outcome"] == "proposed"
    third_proposed = body["order"]["proposed_agent_id"]
    assert third_proposed not in seen
    seen.add(third_proposed)
    assert seen == {str(a_id), str(b_id), str(c_id)}, "all three agents should have been cycled through"

    # Reject #3 -> nobody left at all.
    r = await client.post(f"/orders/{oid}/see-another-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outcome"] == "none"
    assert body["order"]["proposed_agent_id"] is None
    assert body["order"]["status"] == "draft"

    print("See-another correctly excludes every previously-rejected agent, then reports none left.")


@pytest.mark.asyncio
async def test_see_another_only_option_when_a_single_agent_covers_the_market(client, db_session_factory):
    """Exactly one agent covers the market - 'see another' must not reject
    them into a void. It re-proposes the same agent as the only option,
    and does NOT add them to rejected_agent_ids (nothing to gain by
    permanently excluding the only candidate)."""
    market_id = uuid.uuid4()
    token, agent_id = await _make_agent(client, db_session_factory, "+2348060000020", market_id)
    cust_token = await _login(client, "+2348060000021")
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    assert r.json()["proposed_agent_id"] == str(agent_id)

    r = await client.post(f"/orders/{oid}/see-another-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outcome"] == "only_option"
    assert body["order"]["proposed_agent_id"] == str(agent_id), "the only agent should still be proposed"
    assert body["order"]["status"] == "proposed"

    # Confirm it's not a fluke - can still accept the re-confirmed proposal.
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_id)

    print("See-another correctly refuses to reject a customer's only available agent.")


@pytest.mark.asyncio
async def test_agent_has_no_access_until_accepted(client, db_session_factory):
    """The proposed agent cannot see the order on /orders/mine, and can't
    act on it (start-shopping) - agent_id is genuinely unset, not just
    hidden. Once accepted, both become available."""
    market_id = uuid.uuid4()
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, "+2348060000030", market_id)
    agent_h = {"Authorization": f"Bearer {agent_token}"}
    cust_token = await _login(client, "+2348060000031")
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    assert r.json()["status"] == "proposed"

    # Not on the agent's list yet.
    r = await client.get("/orders/mine", headers=agent_h)
    assert oid not in [o["id"] for o in r.json()]

    # Can't act on it either - start-shopping checks agent_id, which is None.
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 403, "the proposed (not yet accepted) agent must not be able to act on the order"

    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text

    r = await client.get("/orders/mine", headers=agent_h)
    assert oid in [o["id"] for o in r.json()], "now visible, post-acceptance"

    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text

    print("Agent correctly has zero access to a proposed-but-unaccepted order.")


@pytest.mark.asyncio
async def test_cannot_reassign_once_shopping_started(client, db_session_factory):
    """Once accepted and shopping has begun, the agent is locked - accept,
    see-another, and release must all be refused."""
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    market_id = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, "+2348060000040", market_id)
    agent_h = {"Authorization": f"Bearer {agent_token}"}
    cust_token = await _login(client, "+2348060000041")
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "shopping"

    # None of the pre-shopping reassignment actions work anymore.
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 409, "cannot accept once shopping has started"

    r = await client.post(f"/orders/{oid}/see-another-agent", headers=cust_h)
    assert r.status_code == 409, "cannot see-another once shopping has started"

    r = await client.post(f"/orders/{oid}/release", headers=agent_h)
    assert r.status_code == 409, "agent cannot release once shopping has started"

    print("Reassignment is correctly blocked once shopping has started.")


@pytest.mark.asyncio
async def test_proposed_agent_display_info(client, db_session_factory):
    """The customer can see who's being proposed (name/phone) before
    deciding - not just an opaque id."""
    market_id = uuid.uuid4()
    token, agent_id = await _make_agent(client, db_session_factory, "+2348060000050", market_id)
    # Give the agent a name, same as ProfileSetup would.
    async with db_session_factory() as s:
        from app.auth.models import User
        agent_user = (await s.execute(select(User).where(User.id == agent_id))).scalar_one()
        agent_user.full_name = "Chidi Okafor"
        await s.commit()

    cust_token = await _login(client, "+2348060000051")
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]

    r = await client.get(f"/orders/{oid}/proposed-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == str(agent_id)
    assert body["full_name"] == "Chidi Okafor"
    assert body["phone"] == "+2348060000050"

    # Once accepted, there's no more pending proposal to show.
    await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    r = await client.get(f"/orders/{oid}/proposed-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    assert r.json() is None

    print("Proposed-agent display info is correct and clears after acceptance.")


@pytest.mark.asyncio
async def test_only_the_order_customer_can_accept_or_see_another(client, db_session_factory):
    market_id = uuid.uuid4()
    token, agent_id = await _make_agent(client, db_session_factory, "+2348060000060", market_id)
    cust_token = await _login(client, "+2348060000061")
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    stranger_token = await _login(client, "+2348060000062")
    stranger_h = {"Authorization": f"Bearer {stranger_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]

    r = await client.post(f"/orders/{oid}/accept-agent", headers=stranger_h)
    assert r.status_code == 403

    r = await client.post(f"/orders/{oid}/see-another-agent", headers=stranger_h)
    assert r.status_code == 403

    print("Only the order's own customer may accept or reject a proposed agent.")
