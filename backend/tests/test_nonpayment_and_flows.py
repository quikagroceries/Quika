"""must_prepay flag, item-not-available flow, packing photos."""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "code": code})
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
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("200000"), market_id=market.id, note="seed")
        await s.commit()
        return (
            {"Authorization": f"Bearer {cust_token}"},
            {"Authorization": f"Bearer {agent_token}"},
            agent.id, cust.id, market.id,
        )


# ---------- must_prepay ----------

@pytest.mark.asyncio
async def test_nonpayment_sets_must_prepay(client, db_session_factory, monkeypatch):
    from app.auth.models import User
    from app.orders.models import Order
    from app.payments import service as pay_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    # small order, no deposit
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": item_id, "price": "1500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    # force the payment window into the past, then expire
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        o.payment_window_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()
    async with db_session_factory() as s:
        await pay_service.expire_stale_orders(s)
        await s.commit()

    # the customer is now flagged must_prepay
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        assert cust.must_prepay is True


@pytest.mark.asyncio
async def test_must_prepay_forces_full_deposit(client, db_session_factory):
    from app.auth.models import User
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    # flag the customer directly
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        cust.must_prepay = True
        await s.commit()

    # a small order that would NORMALLY need no deposit now needs 100%
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "5000.00",
        "items": [{"description": "pepper"}]})
    # estimate = 5000 + 3600 + 2000 = 10600; must_prepay -> deposit = full estimate
    assert Decimal(r.json()["deposit_amount"]) == Decimal("10600.00")


@pytest.mark.asyncio
async def test_must_prepay_exposed_on_me(client, db_session_factory):
    """The frontend can only show the real "full payment upfront" copy (see
    NewOrderFlow.jsx / OrderDetail.jsx) if it knows the flag - GET /auth/me
    must surface it, not just the backend deposit math."""
    from app.auth.models import User
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.get("/auth/me", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["must_prepay"] is False

    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        cust.must_prepay = True
        await s.commit()

    r = await client.get("/auth/me", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["must_prepay"] is True


@pytest.mark.asyncio
async def test_payment_clears_must_prepay(client, db_session_factory, monkeypatch):
    from app.auth.models import User

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        cust.must_prepay = True
        await s.commit()

    # fund wallet and run a full prepay order to completion
    from app.wallet import service as wallet_service
    async with db_session_factory() as s:
        await wallet_service.credit(s, cust_id, Decimal("50000"), note="fund")
        await s.commit()

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "5000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    # pay the (full) deposit
    r = await client.post(f"/payments/orders/{oid}/deposit/pay-from-wallet", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": item_id, "price": "1500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=admin_h)

    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        assert cust.must_prepay is False, "paying should clear the prepay flag"


# ---------- item-not-available ----------

@pytest.mark.asyncio
async def test_item_unavailable_customer_drops(client, db_session_factory):
    from app.orders.models import OrderItem
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "3000.00",
        "items": [{"description": "pepper"}, {"description": "rare spice"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    spice = items[1]["id"]

    # agent flags spice unavailable
    r = await client.post(f"/orders/{oid}/items/{spice}/unavailable", headers=agent_h)
    assert r.status_code == 200 and r.json()["availability"] == "unavailable"

    # customer drops it
    r = await client.post(f"/orders/{oid}/items/{spice}/decide", headers=admin_h,
                          json={"decision": "dropped"})
    assert r.status_code == 200 and r.json()["availability"] == "dropped"

    # the agent gets notified of the decision, not just a silent DB update
    r = await client.get("/notifications", headers=agent_h)
    assert r.status_code == 200, r.text
    kinds = [n["kind"] for n in r.json()]
    assert "item_decided" in kinds, "agent should be notified when the customer decides"


@pytest.mark.asyncio
async def test_item_unavailable_no_answer_falls_back(client, db_session_factory, monkeypatch):
    from app.orders.models import OrderItem

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "3000.00",
        "items": [{"description": "pepper"}, {"description": "rare spice"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    # buy pepper, flag spice unavailable, customer never answers
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[0]["id"], "price": "500.00"}]})
    await client.post(f"/orders/{oid}/items/{items[1]['id']}/unavailable", headers=agent_h)

    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    # the unanswered item fell back to buy_elsewhere (buy-as-listed)
    async with db_session_factory() as s:
        spice = (await s.execute(select(OrderItem).where(OrderItem.id == uuid.UUID(items[1]["id"])))).scalar_one()
        assert spice.availability == "buy_elsewhere"


# ---------- packing photos ----------

@pytest.mark.asyncio
async def test_packing_photos_attach(client, db_session_factory):
    from app.orders.models import Order
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text

    r = await client.post(f"/delivery/orders/{oid}/packing-photos", headers=agent_h,
                          json={"refs": ["photos/pack1.jpg", "photos/pack2.jpg"]})
    assert r.status_code == 200, r.text
    assert len(r.json()["packing_photos"]) == 2

    # a second batch appends
    r = await client.post(f"/delivery/orders/{oid}/packing-photos", headers=agent_h,
                          json={"refs": ["photos/pack3.jpg"]})
    assert len(r.json()["packing_photos"]) == 3
