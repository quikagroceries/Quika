"""Tests for the agent Dashboard tab: GET /agent/summary and
PATCH /agent/availability."""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348050000001"
PHONE_AGENT = "+2348050000002"


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
    from app.markets.models import Agent

    token = await _login(client, phone, role="agent")
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.phone == phone))).scalar_one()
        s.add(Agent(user_id=user.id, assigned_market_id=market_id, is_available=True))
        await s.commit()
        agent_id = user.id
    return token, agent_id


@pytest.mark.asyncio
async def test_agent_summary_counts_tasks_by_bucket(client, db_session_factory):
    """Ready to shop / in progress / waiting on customer - the same three
    buckets Home groups into - surfaced here as counts."""
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    market_id = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("500000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, PHONE_AGENT, market_id)
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    # Order 1: small, no deposit needed -> ready to shop immediately.
    cust1_token = await _login(client, PHONE_CUST)
    cust1_h = {"Authorization": f"Bearer {cust1_token}"}
    r = await client.post("/orders", headers=cust1_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    assert r.json()["proposed_agent_id"] == str(agent_id)
    oid1_created = r.json()["id"]
    # Phase 1: only PROPOSED at creation - accept before it counts as a task.
    r = await client.post(f"/orders/{oid1_created}/accept-agent", headers=cust1_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_id)

    r = await client.get("/agent/summary", headers=agent_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ready_to_shop_count"] == 1
    assert body["in_progress_count"] == 0
    assert body["waiting_on_customer_count"] == 0
    assert body["is_available"] is True
    assert body["on_duty"] is True

    # Order 2: big enough to need a deposit, unpaid -> waiting on customer,
    # NOT ready to shop even though it's also agent_assigned. Needs its own
    # agent (this one is no longer available once busy) - reuse the pool by
    # checking a second agent covers the market? Simpler: this agent is still
    # AGENT_ASSIGNED (not SHOPPING yet) on order 1, so is_available is still
    # True and they'll auto-assign to order 2 as well.
    cust2_token = await _login(client, "+2348050000003")
    cust2_h = {"Authorization": f"Bearer {cust2_token}"}
    r = await client.post("/orders", headers=cust2_h, json={
        "market_id": str(market_id), "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    assert r.json()["proposed_agent_id"] == str(agent_id)
    assert Decimal(r.json()["deposit_amount"]) > 0
    oid2_created = r.json()["id"]
    r = await client.post(f"/orders/{oid2_created}/accept-agent", headers=cust2_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_id)

    r = await client.get("/agent/summary", headers=agent_h)
    body = r.json()
    assert body["ready_to_shop_count"] == 1
    assert body["waiting_on_customer_count"] == 1

    # Start shopping order 1 -> moves to in_progress, still not double-counted.
    oid1 = None
    r2 = await client.get("/orders/mine", headers=agent_h)
    for o in r2.json():
        if o["status"] == "agent_assigned" and Decimal(o["deposit_amount"]) == 0:
            oid1 = o["id"]
    assert oid1 is not None
    r = await client.post(f"/orders/{oid1}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text

    r = await client.get("/agent/summary", headers=agent_h)
    body = r.json()
    assert body["ready_to_shop_count"] == 0
    assert body["in_progress_count"] == 1
    assert body["waiting_on_customer_count"] == 1


@pytest.mark.asyncio
async def test_agent_earnings_reflect_paid_orders_with_correct_share(client, db_session_factory, monkeypatch):
    """A fully paid order's agent_share shows up in today/week/total, and a
    still-unpaid order contributes nothing."""
    from app.core.enums import LedgerDirection, OrderStatus
    from app.float import service as float_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    market_id = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("50000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, PHONE_AGENT, market_id)
    cust_token = await _login(client, PHONE_CUST)
    agent_h = {"Authorization": f"Bearer {agent_token}"}
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id),
        "items": [{"description": "pepper", "listed_price": "500.00"}],
    })
    oid = r.json()["id"]
    assert r.json()["proposed_agent_id"] == str(agent_id)
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_id)

    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    r = await client.get(f"/orders/{oid}", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": item_id, "price": "500.00"}]})
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    expected_share = Decimal(r.json()["agent_share"])
    assert expected_share > 0, r.json()

    # Not paid yet -> no earnings.
    r = await client.get("/agent/summary", headers=agent_h)
    assert Decimal(r.json()["earnings_total"]) == Decimal("0.00")
    assert r.json()["completed_orders"] == []

    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=cust_h)
    assert r.status_code == 402, "wallet is empty, expected the insufficient-funds gate"

    from app.wallet import service as wallet_service
    async with db_session_factory() as s:
        from app.auth.models import User
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        await wallet_service.credit(s, cust.id, Decimal("50000.00"), note="test fund")
        await s.commit()

    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=cust_h)
    assert r.status_code == 200, r.text

    r = await client.get("/agent/summary", headers=agent_h)
    body = r.json()
    assert Decimal(body["earnings_today"]) == expected_share
    assert Decimal(body["earnings_week"]) == expected_share
    assert Decimal(body["earnings_total"]) == expected_share
    assert len(body["completed_orders"]) == 1
    assert body["completed_orders"][0]["id"] == oid
    assert Decimal(body["completed_orders"][0]["agent_share"]) == expected_share
    assert body["completed_orders"][0]["status"] == OrderStatus.PAID.value


@pytest.mark.asyncio
async def test_availability_toggle_and_guard(client, db_session_factory):
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    market_id = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("500000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, PHONE_AGENT, market_id)
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    # Freely pausable when not shopping.
    r = await client.patch("/agent/availability", headers=agent_h, json={"is_available": False})
    assert r.status_code == 200, r.text
    assert r.json()["is_available"] is False

    r = await client.patch("/agent/availability", headers=agent_h, json={"is_available": True})
    assert r.status_code == 200
    assert r.json()["is_available"] is True

    # Now put them mid-shop and confirm they can't self-report available
    # while actually busy (that's finish_shopping's job).
    cust_token = await _login(client, PHONE_CUST)
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)

    r = await client.patch("/agent/availability", headers=agent_h, json={"is_available": True})
    assert r.status_code == 409, r.text
