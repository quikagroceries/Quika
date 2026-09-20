"""Per-item overage flow (#5): when the agent finds an item's real price
above the customer's listed price, they request approval for JUST that
item (not the whole order's aggregate cap - see test_jit.py for that).
Covers: request/approve/decline, agent keeps shopping while pending, and
an unanswered overage is skipped at finish_shopping rather than bought.
"""

from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348030000001"
PHONE_AGENT = "+2348030000002"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"identifier": phone, "code": code})
    return r.json()["access_token"]


async def _setup(client, db_session_factory):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent.role = UserRole.AGENT
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("200000"), market_id=market.id, note="seed")
        await s.commit()
        return (
            {"Authorization": f"Bearer {cust_token}"},
            {"Authorization": f"Bearer {agent_token}"},
            agent.id, market.id,
        )


async def _order_shopping(client, cust_h, agent_h, market_id, items, listed_items_total="0.00"):
    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": listed_items_total, "items": items,
    })
    assert r.status_code == 201, r.text
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    return oid, r.json()["items"]


@pytest.mark.asyncio
async def test_request_overage_requires_price_above_listed(client, db_session_factory):
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
    ])
    item_id = items[0]["id"]

    # At or below listed price - not an overage, refused.
    r = await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                           headers=agent_h, json={"price": "900.00"})
    assert r.status_code == 400, r.text

    # Above listed price - accepted, item flips to overage_pending.
    r = await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                           headers=agent_h, json={"price": "1500.00"})
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "overage_pending"
    assert r.json()["overage_requested_price"] == "1500.00"


@pytest.mark.asyncio
async def test_customer_notified_with_advisory_tip(client, db_session_factory):
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
    ])
    item_id = items[0]["id"]
    await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                       headers=agent_h, json={"price": "1500.00"})

    r = await client.get("/notifications", headers=cust_h)
    assert r.status_code == 200, r.text
    notes = [n for n in r.json() if n["kind"] == "item_overage"]
    assert len(notes) == 1
    assert "hop on a call" in notes[0]["message"]


@pytest.mark.asyncio
async def test_agent_keeps_shopping_other_items_while_overage_pending(client, db_session_factory):
    """The core of #5: one item pending approval must never block paying for
    the others."""
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
        {"description": "rice", "listed_price": "2000.00"},
    ])
    pepper_id, rice_id = items[0]["id"], items[1]["id"]

    r = await client.post(f"/orders/{oid}/items/{pepper_id}/request-overage",
                           headers=agent_h, json={"price": "1500.00"})
    assert r.status_code == 200, r.text

    # Rice is untouched by the pending overage - agent pays for it normally.
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": rice_id, "price": "2000.00"}]})
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_customer_approves_overage_then_agent_pays(client, db_session_factory):
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    # Extra headroom on the aggregate cap so the approved overage (1500, vs
    # the item's own 1000 listed price) doesn't also trip the UNRELATED
    # whole-order spending cap (see test_jit.py) - this test is only about
    # the per-item approval flow.
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
    ], listed_items_total="1000.00")
    item_id = items[0]["id"]
    await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                       headers=agent_h, json={"price": "1500.00"})

    r = await client.post(f"/orders/{oid}/items/{item_id}/overage-decide",
                           headers=cust_h, json={"decision": "approved"})
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "pending"

    r = await client.get("/notifications", headers=agent_h)
    kinds = [n["kind"] for n in r.json()]
    assert "item_overage_decided" in kinds

    # Now the agent can actually pay for it.
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": "1500.00"}]})
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_customer_declines_overage_item_stays_unbought(client, db_session_factory):
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
        {"description": "rice", "listed_price": "2000.00"},
    ])
    pepper_id, rice_id = items[0]["id"], items[1]["id"]
    await client.post(f"/orders/{oid}/items/{pepper_id}/request-overage",
                       headers=agent_h, json={"price": "1500.00"})

    r = await client.post(f"/orders/{oid}/items/{pepper_id}/overage-decide",
                           headers=cust_h, json={"decision": "declined"})
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "dropped"

    # Buy the other item and finish - pepper stays skipped, not in the total.
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": rice_id, "price": "2000.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["items_total"]) == Decimal("2000.00")


@pytest.mark.asyncio
async def test_unanswered_overage_is_skipped_not_bought_at_finish(client, db_session_factory, monkeypatch):
    """If the customer never responds, finish_shopping must NOT fall back to
    buying it (unlike the item-unavailable flow) - it's simply skipped."""
    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
        {"description": "rice", "listed_price": "2000.00"},
    ])
    pepper_id, rice_id = items[0]["id"], items[1]["id"]
    await client.post(f"/orders/{oid}/items/{pepper_id}/request-overage",
                       headers=agent_h, json={"price": "1500.00"})
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": rice_id, "price": "2000.00"}]})

    # No customer response at all.
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["items_total"]) == Decimal("2000.00"), "the unanswered item must not be bought"

    from app.orders.models import OrderItem
    import uuid as _uuid
    async with db_session_factory() as s:
        pepper = (await s.execute(select(OrderItem).where(OrderItem.id == _uuid.UUID(pepper_id)))).scalar_one()
        assert pepper.availability == "dropped"
        assert pepper.confirmed_price is None


@pytest.mark.asyncio
async def test_only_assigned_agent_and_order_customer_can_act(client, db_session_factory):
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "pepper", "listed_price": "1000.00"},
    ])
    item_id = items[0]["id"]

    stranger_token = await _login(client, "+2348030000099")
    stranger_h = {"Authorization": f"Bearer {stranger_token}"}

    r = await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                           headers=stranger_h, json={"price": "1500.00"})
    assert r.status_code == 403

    await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                       headers=agent_h, json={"price": "1500.00"})
    r = await client.post(f"/orders/{oid}/items/{item_id}/overage-decide",
                           headers=stranger_h, json={"decision": "approved"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_no_listed_price_means_no_overage_concept(client, db_session_factory):
    """Budget/unstructured items with no listed_price have nothing to compare
    against - request-overage must refuse, not silently accept."""
    cust_h, agent_h, agent_id, market_id = await _setup(client, db_session_factory)
    oid, items = await _order_shopping(client, cust_h, agent_h, market_id, [
        {"description": "assorted spices"},
    ])
    item_id = items[0]["id"]
    r = await client.post(f"/orders/{oid}/items/{item_id}/request-overage",
                           headers=agent_h, json={"price": "1500.00"})
    assert r.status_code == 400, r.text
