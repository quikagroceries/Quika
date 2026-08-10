import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import settings

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "code": code})
    return r.json()["access_token"]


async def _drive_order_to_awaiting_payment(client, db_session_factory, monkeypatch):
    """Reuse the order flow to get an order into AWAITING_PAYMENT."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)

    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        agent.role = UserRole.AGENT
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        cust.role = UserRole.ADMIN  # so the same token can assign the agent
        await s.commit()
        agent_id = agent.id
        # seed float pool
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market_id, note="seed",
        )
        await s.commit()

    admin_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        # Goods-only cap (#9) needs a real estimate to cover the 500+1000
        # payments below - with none, the cap would be 0.
        "listed_items_total": "2000.00",
        "items": [{"description": "500 naira pepper"}, {"description": "1000 naira rice"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "500.00"}]})
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[1]["id"], "price": "1000.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    return oid, cust_token, r.json(), market_id


def _sign(body: bytes) -> str:
    return hmac.new(settings.paystack_secret_key.encode(), body, hashlib.sha512).hexdigest()


@pytest.mark.asyncio
async def test_checkout_and_webhook_paid_and_recycle(client, db_session_factory, monkeypatch):
    from app.core.enums import OrderStatus
    from app.float import service as float_service
    from app.orders.models import Order

    # Mock Paystack initialize so no real network call happens
    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)
    settings.paystack_secret_key = "sk_test_dummy"

    oid, cust_token, final, market_id = await _drive_order_to_awaiting_payment(client, db_session_factory, monkeypatch)
    grand_total = Decimal(final["grand_total"])
    assert final["status"] == "awaiting_payment"

    # Customer starts checkout
    r = await client.post(f"/payments/orders/{oid}/checkout", headers={"Authorization": f"Bearer {cust_token}"})
    assert r.status_code == 200, r.text
    reference = r.json()["reference"]

    # Pool balance before payment confirmation
    async with db_session_factory() as s:
        pool_before = await float_service.get_pool_balance(s, market_id)

    # --- Webhook with a BAD signature is rejected ---
    body = json.dumps({"event": "charge.success", "data": {"reference": reference}}).encode()
    r = await client.post("/payments/webhook", content=body, headers={"x-paystack-signature": "wrong"})
    assert r.status_code == 401

    # Order must still be awaiting payment
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.AWAITING_PAYMENT

    # --- Webhook with a VALID signature flips to PAID + recycles float ---
    r = await client.post("/payments/webhook", content=body, headers={"x-paystack-signature": _sign(body)})
    assert r.status_code == 200

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.PAID
        pool_after = await float_service.get_pool_balance(s, market_id)
    assert pool_after - pool_before == grand_total, "float pool not recycled correctly"

    # --- Idempotency: firing the same webhook again does NOT double-credit ---
    r = await client.post("/payments/webhook", content=body, headers={"x-paystack-signature": _sign(body)})
    assert r.status_code == 200
    async with db_session_factory() as s:
        pool_final = await float_service.get_pool_balance(s, market_id)
    assert pool_final == pool_after, "webhook double-credited the pool"

    print("Checkout, signed webhook, PAID transition, float recycle, idempotency all pass.")


@pytest.mark.asyncio
async def test_checkout_verify_on_return_pays_and_is_idempotent(client, db_session_factory, monkeypatch):
    """The verify-on-return path (payment chooser's "pay by transfer"): same
    end state as the webhook, reachable without one ever firing - this is
    what makes the round-trip work in a dev environment Paystack can't reach.
    """
    from app.core.enums import OrderStatus
    from app.float import service as float_service
    from app.orders.models import Order

    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        assert callback_url is not None
        assert "/orders/" in callback_url
        assert callback_url.endswith(f"?order_ref={reference}")
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)

    async def fake_verify(reference):
        return {"status": "success", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.verify_transaction", fake_verify)
    settings.paystack_secret_key = "sk_test_dummy"

    oid, cust_token, final, market_id = await _drive_order_to_awaiting_payment(client, db_session_factory, monkeypatch)
    grand_total = Decimal(final["grand_total"])
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post(
        f"/payments/orders/{oid}/checkout", headers=cust_h,
        json={"origin": "http://localhost:5173"},
    )
    assert r.status_code == 200, r.text
    reference = r.json()["reference"]

    async with db_session_factory() as s:
        pool_before = await float_service.get_pool_balance(s, market_id)

    r = await client.post(
        f"/payments/orders/{oid}/checkout/verify", headers=cust_h,
        json={"reference": reference},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"status": "paid", "verified": True}

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.PAID
        pool_after = await float_service.get_pool_balance(s, market_id)
    assert pool_after - pool_before == grand_total

    # Idempotent: verifying again (e.g. a page refresh) doesn't double-credit.
    r = await client.post(
        f"/payments/orders/{oid}/checkout/verify", headers=cust_h,
        json={"reference": reference},
    )
    assert r.status_code == 200
    async with db_session_factory() as s:
        pool_final = await float_service.get_pool_balance(s, market_id)
    assert pool_final == pool_after

    print("Verify-on-return: pays, recycles float, and is idempotent.")


@pytest.mark.asyncio
async def test_checkout_verify_rejects_someone_elses_reference(client, db_session_factory, monkeypatch):
    """A reference from a different order can't be used to probe/confirm
    this one - the ownership check keys off the transaction's actual order,
    since (unlike wallet funding) the customer id isn't in the reference."""
    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)
    settings.paystack_secret_key = "sk_test_dummy"

    oid, cust_token, _final, _market_id = await _drive_order_to_awaiting_payment(client, db_session_factory, monkeypatch)
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post(
        f"/payments/orders/{oid}/checkout/verify", headers=cust_h,
        json={"reference": "quika_not_a_real_reference"},
    )
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_deposit_checkout_verify_on_return(client, db_session_factory, monkeypatch):
    """Same verify-on-return reconciliation, for the deposit path."""
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    async def fake_init(*, email, amount_naira, reference, callback_url=None):
        assert callback_url is not None
        assert "/orders/" in callback_url
        assert callback_url.endswith(f"?order_deposit_ref={reference}")
        return {"authorization_url": f"https://paystack.test/{reference}", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.initialize_transaction", fake_init)

    async def fake_verify(reference):
        return {"status": "success", "reference": reference}
    monkeypatch.setattr("app.payments.paystack.verify_transaction", fake_verify)
    settings.paystack_secret_key = "sk_test_dummy"

    cust_token = await _login(client, PHONE_CUST)
    async with db_session_factory() as s:
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("500000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    cust_h = {"Authorization": f"Bearer {cust_token}"}

    # Goods total well past the 30,000 deposit threshold.
    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    assert deposit == Decimal("15600.00")

    r = await client.post(
        f"/payments/orders/{oid}/deposit/checkout", headers=cust_h,
        json={"origin": "http://localhost:5173"},
    )
    assert r.status_code == 200, r.text
    reference = r.json()["reference"]

    async with db_session_factory() as s:
        pool_before = await float_service.get_pool_balance(s, market_id)

    r = await client.post(
        f"/payments/orders/{oid}/deposit/checkout/verify", headers=cust_h,
        json={"reference": reference},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"deposit_paid": True, "verified": True}

    async with db_session_factory() as s:
        pool_after = await float_service.get_pool_balance(s, market_id)
    assert pool_after - pool_before == deposit

    print("Deposit verify-on-return: pays and recycles float correctly.")


@pytest.mark.asyncio
async def test_stale_order_auto_cancels(client, db_session_factory, monkeypatch):
    from app.core.enums import OrderStatus
    from app.orders.models import Order
    from app.payments import service

    oid, cust_token, final, market_id = await _drive_order_to_awaiting_payment(client, db_session_factory, monkeypatch)

    # Force the payment window into the past
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        o.payment_window_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()

    async with db_session_factory() as s:
        count = await service.expire_stale_orders(s)
        await s.commit()
    assert count == 1

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.CANCELLED_UNPAID

    print("Stale unpaid order auto-cancelled correctly.")
