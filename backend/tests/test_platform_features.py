"""Tests for dev-seed, auto-assign, notifications, wallet funding, admin views."""

import uuid
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


# ---------- Auto-assign ----------

@pytest.mark.asyncio
async def test_order_auto_assigns_available_agent(client, db_session_factory):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)

    async with db_session_factory() as s:
        agent_u = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent_u.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        market = Market(name="Test Market", city="PH", state="Rivers")
        s.add(market)
        await s.flush()
        s.add(Agent(user_id=agent_u.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000"),
            market_id=market.id, note="seed")
        await s.commit()
        market_id, agent_uid = market.id, agent_u.id

    admin_h = {"Authorization": f"Bearer {cust_token}"}

    # Create an order for that market — should PROPOSE the agent (#10:
    # propose->accept, not an instant hard-assign). The agent has no access
    # yet - agent_id stays unset until the customer explicitly accepts.
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "items": [{"description": "500 naira pepper"}],
    })
    assert r.status_code == 201, r.text
    order = r.json()
    oid = order["id"]
    assert order["proposed_agent_id"] == str(agent_uid), "agent not proposed"
    assert order["agent_id"] is None, "must not be assigned before acceptance"
    assert order["status"] == "proposed"

    # The proposed agent doesn't see it on /orders/mine until accepted.
    r = await client.get("/orders/mine", headers={"Authorization": f"Bearer {agent_token}"})
    assert oid not in [o["id"] for o in r.json()]

    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_uid)
    assert r.json()["status"] == "agent_assigned"

    r = await client.get("/orders/mine", headers={"Authorization": f"Bearer {agent_token}"})
    assert oid in [o["id"] for o in r.json()], "accepted order should now show up for the agent"


@pytest.mark.asyncio
async def test_no_agent_leaves_order_unassigned(client, db_session_factory):
    from app.auth.models import User
    from app.core.enums import UserRole

    cust_token = await _login(client, PHONE_CUST)
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        await s.commit()
    admin_h = {"Authorization": f"Bearer {cust_token}"}

    # market with no agents
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(uuid.uuid4()),
        "items": [{"description": "pepper"}],
    })
    order = r.json()
    assert order["agent_id"] is None
    assert order["status"] == "draft"  # stays unassigned, doesn't vanish


# ---------- Notifications ----------

@pytest.mark.asyncio
async def test_customer_notified_when_shopping_done(client, db_session_factory, monkeypatch):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    async with db_session_factory() as s:
        agent_u = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent_u.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent_u.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000"),
            market_id=market.id, note="seed")
        await s.commit()
        market_id = market.id

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    # customer should have a payment_due notification
    r = await client.get("/notifications", headers=admin_h)
    assert r.status_code == 200
    kinds = [n["kind"] for n in r.json()]
    assert "payment_due" in kinds


@pytest.mark.asyncio
async def test_agent_freed_after_shopping(client, db_session_factory, monkeypatch):
    """Availability flips: busy on start, free on finish."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    async with db_session_factory() as s:
        agent_u = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent_u.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent_u.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000"),
            market_id=market.id, note="seed")
        await s.commit()
        market_id, agent_uid = market.id, agent_u.id

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text

    await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    async with db_session_factory() as s:
        a = (await s.execute(select(Agent).where(Agent.user_id == agent_uid))).scalar_one()
        assert a.is_available is False  # busy while shopping

    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)  # noop-ish
    items = (await client.get(f"/orders/{oid}/bargained-list", headers=admin_h)).json()
    # confirm + finish
    r = await client.get(f"/orders/{oid}", headers=admin_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": "500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    async with db_session_factory() as s:
        a = (await s.execute(select(Agent).where(Agent.user_id == agent_uid))).scalar_one()
        assert a.is_available is True  # free again after finishing


# ---------- Admin oversight ----------

@pytest.mark.asyncio
async def test_admin_float_and_inflight_views(client, db_session_factory):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    cust_token = await _login(client, PHONE_CUST)
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000"), note="seed")
        await s.commit()
    admin_h = {"Authorization": f"Bearer {cust_token}"}

    # create an unassigned order so in-flight shows it
    await client.post("/orders", headers=admin_h, json={
        "market_id": str(uuid.uuid4()), "items": [{"description": "pepper"}]})

    r = await client.get("/admin/float", headers=admin_h)
    assert r.status_code == 200
    assert Decimal(r.json()["pool_balance"]) == Decimal("100000.00")

    r = await client.get("/admin/orders/in-flight", headers=admin_h)
    assert r.status_code == 200
    assert r.json()["count"] >= 1
    assert r.json()["unassigned"] >= 1


@pytest.mark.asyncio
async def test_admin_float_recent_movements_scoped_to_requested_market(client, db_session_factory):
    """/admin/float?market_id=X must only ever show X's own movements - not
    a global "last 20 across every market" feed leaking other markets' notes
    into a screen that's supposed to be scoped to one pool."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    admin_phone = "+2348070000101"
    admin_token = await _login(client, admin_phone)
    async with db_session_factory() as s:
        admin_u = (await s.execute(select(User).where(User.phone == admin_phone))).scalar_one()
        admin_u.role = UserRole.ADMIN
        await s.commit()
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    m1, m2 = uuid.uuid4(), uuid.uuid4()

    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("10000"),
            market_id=m1, note="market-1-only")
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("20000"),
            market_id=m2, note="market-2-only")
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("5000"), note="global-only")
        await s.commit()

    r = await client.get(f"/admin/float?market_id={m1}", headers=admin_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert Decimal(body["pool_balance"]) == Decimal("10000.00")
    notes = {m["note"] for m in body["recent_movements"]}
    assert notes == {"market-1-only"}

    r = await client.get(f"/admin/float?market_id={m2}", headers=admin_h)
    notes = {m["note"] for m in r.json()["recent_movements"]}
    assert notes == {"market-2-only"}

    r = await client.get("/admin/float", headers=admin_h)
    notes = {m["note"] for m in r.json()["recent_movements"]}
    assert notes == {"global-only"}

    print("Admin float movement history correctly scoped per market.")


@pytest.mark.asyncio
async def test_admin_views_reject_non_admin(client, db_session_factory):
    cust_token = await _login(client, PHONE_CUST)  # stays a customer
    r = await client.get("/admin/float", headers={"Authorization": f"Bearer {cust_token}"})
    assert r.status_code == 403


# ---------- Wallet funding security ----------

@pytest.mark.asyncio
async def test_wallet_funding_via_paystack_webhook(client, db_session_factory, monkeypatch):
    """The real funding path: init -> webhook credits. No free top-ups."""
    import hashlib, hmac, json
    from app.core.config import settings
    from app.wallet import service as wallet_service

    settings.paystack_secret_key = "sk_test_dummy"

    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)

    cust_token = await _login(client, PHONE_CUST)
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    from app.auth.models import User
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust_id = cust.id

    # init funding
    r = await client.post("/payments/wallet/fund/init", headers=cust_h, json={"amount": "5000.00"})
    assert r.status_code == 200, r.text
    ref = r.json()["reference"]
    assert ref.startswith("fund_")

    # wallet still empty until webhook confirms
    async with db_session_factory() as s:
        assert await wallet_service.get_balance(s, cust_id) == Decimal("0.00")

    # webhook confirms
    body = json.dumps({"event": "charge.success", "data": {"reference": ref}}).encode()
    sig = hmac.new(settings.paystack_secret_key.encode(), body, hashlib.sha512).hexdigest()
    r = await client.post("/payments/webhook", content=body, headers={"x-paystack-signature": sig})
    assert r.status_code == 200

    async with db_session_factory() as s:
        assert await wallet_service.get_balance(s, cust_id) == Decimal("5000.00")


# ---------- Wallet transactions ----------

@pytest.mark.asyncio
async def test_wallet_transactions_lists_ledger_newest_first(client):
    """Settings/Wallet page history: every wallet movement, newest first."""
    token = await _login(client, "+2348050000009")
    h = {"Authorization": f"Bearer {token}"}

    # No wallet activity yet.
    r = await client.get("/wallet/transactions", headers=h)
    assert r.status_code == 200, r.text
    assert r.json() == []

    r = await client.post("/wallet/fund", headers=h, json={"amount": "3000.00"})
    assert r.status_code == 200, r.text
    r = await client.post("/wallet/fund", headers=h, json={"amount": "1500.00"})
    assert r.status_code == 200, r.text

    r = await client.get("/wallet/transactions", headers=h)
    assert r.status_code == 200, r.text
    entries = r.json()
    assert len(entries) == 2
    # Newest first: the second top-up (1500) comes before the first (3000).
    assert entries[0]["amount"] == "1500.00"
    assert entries[0]["balance_after"] == "4500.00"
    assert entries[0]["direction"] == "credit"
    assert entries[1]["amount"] == "3000.00"
    assert entries[1]["balance_after"] == "3000.00"

    # A stranger's wallet is untouched and empty.
    other_token = await _login(client, "+2348050000010")
    r = await client.get("/wallet/transactions", headers={"Authorization": f"Bearer {other_token}"})
    assert r.status_code == 200, r.text
    assert r.json() == []


# ---------- Dev seed ----------

@pytest.mark.asyncio
async def test_dev_seed_returns_three_tokens(client):
    r = await client.post("/dev/seed")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["admin_token"] and data["agent_token"] and data["customer_token"]
    assert data["market_id"]
