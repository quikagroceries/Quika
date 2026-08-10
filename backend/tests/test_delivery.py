import hashlib
import hmac
import json
import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import settings

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"
PHONE_RIDER = "+2348030000003"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "code": code})
    return r.json()["access_token"]


def _sign(body: bytes) -> str:
    return hmac.new(settings.paystack_secret_key.encode(), body, hashlib.sha512).hexdigest()


@pytest.mark.asyncio
async def test_full_delivery_and_payout(client, db_session_factory, monkeypatch):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, OrderStatus, UserRole
    from app.float import service as float_service
    from app.orders.models import Order

    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)
    settings.paystack_secret_key = "sk_test_dummy"

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    # --- set up customer(admin), agent, rider ---
    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    rider_token = await _login(client, PHONE_RIDER)

    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent.role = UserRole.AGENT
        rider = (await s.execute(select(User).where(User.phone == PHONE_RIDER))).scalar_one()
        rider.role = UserRole.RIDER
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        await s.commit()
        agent_id, rider_id = agent.id, rider.id
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}
    rider_h = {"Authorization": f"Bearer {rider_token}"}

    # --- order through to PAID ---
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "500 naira pepper"}, {"description": "1000 naira rice"}]})
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[0]["id"], "price": "500.00"}]})
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[1]["id"], "price": "1000.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    final = r.json()
    grand_total = Decimal(final["grand_total"])   # 7100
    agent_share = Decimal(final["agent_share"])   # 1000
    company_share = Decimal(final["company_share"])  # 1000
    delivery_fee = Decimal(final["delivery_fee"]) # 3600

    # pay via webhook
    r = await client.post(f"/payments/orders/{oid}/checkout", headers=admin_h)
    ref = r.json()["reference"]
    body = json.dumps({"event": "charge.success", "data": {"reference": ref}}).encode()
    await client.post("/payments/webhook", content=body, headers={"x-paystack-signature": _sign(body)})

    async with db_session_factory() as s:
        pool_after_payment = await float_service.get_pool_balance(s, market_id)

    # --- delivery arc ---
    # can't pack as wrong role
    r = await client.post(f"/delivery/orders/{oid}/pack", headers=rider_h)
    assert r.status_code == 403

    r = await client.post(f"/delivery/orders/{oid}/pack", headers=agent_h)
    assert r.status_code == 200 and r.json()["status"] == "packed"

    r = await client.post(
        f"/delivery/orders/{oid}/dispatch-courier", headers=admin_h,
        json={"courier_reference": "KWIK-TRACK-12345"},
    )
    assert r.status_code == 200 and r.json()["status"] == "out_for_delivery"
    assert r.json()["courier_reference"] == "KWIK-TRACK-12345"

    # Confirmed it's readable back from the order itself too, not just the
    # dispatch response - this is what a tracking screen would poll.
    r = await client.get(f"/orders/{oid}", headers=admin_h)
    assert r.json()["courier_reference"] == "KWIK-TRACK-12345"

    # --- customer confirms delivery -> payout split ---
    r = await client.post(f"/delivery/orders/{oid}/confirm-delivery", headers=admin_h)
    assert r.status_code == 200, r.text
    split = r.json()
    assert Decimal(split["agent_payout"]) == agent_share
    assert Decimal(split["courier_cost"]) == delivery_fee
    assert Decimal(split["company_retained"]) == company_share

    # order closed
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.CLOSED
        pool_final = await float_service.get_pool_balance(s, market_id)

        # Status-timeline fields: each stamped exactly once, in the order the
        # customer's tracking screen expects to display them.
        assert o.agent_assigned_at is not None
        assert o.paid_at is not None
        assert o.packed_at is not None
        assert o.dispatched_at is not None
        assert o.delivered_at is not None
        assert (
            o.agent_assigned_at <= o.paid_at <= o.packed_at
            <= o.dispatched_at <= o.delivered_at
        ), "timeline timestamps must be chronological"
        # 4-digit handover PIN, generated at dispatch.
        assert o.handover_code is not None and len(o.handover_code) == 4
        assert o.handover_code.isdigit()

    # pool should have dropped by agent_share + delivery_fee (payouts released)
    assert pool_after_payment - pool_final == agent_share + delivery_fee

    print("Delivery arc + payout split + pool release all correct.")


@pytest.mark.asyncio
async def test_cannot_pack_unpaid_order(client, db_session_factory):
    """The gate: an order that isn't paid cannot enter delivery."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        await s.commit()
        agent_id = agent.id
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "items": [{"description": "500 naira pepper"}]})
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    # order is in SHOPPING, never paid — packing must fail
    r = await client.post(f"/delivery/orders/{oid}/pack", headers=agent_h)
    assert r.status_code == 409, "unpaid order should not be packable"
    print("Unpaid order correctly blocked from delivery.")


@pytest.mark.asyncio
async def test_agent_can_dispatch_own_order_others_cannot(client, db_session_factory, monkeypatch):
    """The assigned agent can dispatch their own packed order (the normal
    one-tap-after-packing path) without needing an admin; a DIFFERENT agent
    is refused. No explicit courier_reference -> one is auto-generated so
    there's always something for a tracking screen to show."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)
    other_agent_token = await _login(client, "+2348040000004")
    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent.role = UserRole.AGENT
        other_agent = (await s.execute(select(User).where(User.phone == "+2348040000004"))).scalar_one()
        other_agent.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN
        await s.commit()
        agent_id = agent.id
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}
    other_agent_h = {"Authorization": f"Bearer {other_agent_token}"}

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "500 naira pepper"}]})
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": item_id, "price": "500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    r = await client.post("/wallet/fund", headers=admin_h, json={"amount": "20000.00"})
    assert r.status_code == 200, r.text
    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=admin_h)
    assert r.status_code == 200, r.text

    r = await client.post(f"/delivery/orders/{oid}/pack", headers=agent_h)
    assert r.status_code == 200, r.text

    # A different agent, not assigned to this order, cannot dispatch it.
    r = await client.post(f"/delivery/orders/{oid}/dispatch-courier", headers=other_agent_h)
    assert r.status_code == 403, "only the assigned agent (or an admin) may dispatch"

    # The assigned agent can, with no explicit reference -> one is generated.
    r = await client.post(f"/delivery/orders/{oid}/dispatch-courier", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "out_for_delivery"
    assert r.json()["courier_reference"], "a tracking reference should be auto-generated"

    print("Agent-dispatch ownership check and auto-generated reference both correct.")
