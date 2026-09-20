"""Tests for the settled Qyka money model: fees, deposit, refunds, wallet."""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"identifier": phone, "code": code})
    return r.json()["access_token"]


async def _setup(client, db_session_factory):
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
        agent_id, cust_id = agent.id, cust.id
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("500000.00"),
            market_id=market_id, note="seed")
        await s.commit()
    return (
        {"Authorization": f"Bearer {cust_token}"},
        {"Authorization": f"Bearer {agent_token}"},
        agent_id, cust_id, market_id,
    )




async def _pay_deposit(client, db_session_factory, oid, cust_id, headers, deposit):
    """Fund the wallet and pay the order's deposit so shopping can start."""
    from app.wallet import service as wallet_service
    async with db_session_factory() as s:
        await wallet_service.credit(s, cust_id, deposit, note="test fund")
        await s.commit()
    r = await client.post(f"/payments/orders/{oid}/deposit/pay-from-wallet", headers=headers)
    assert r.status_code == 200, r.text


# ---------- Fee policy (pure functions) ----------

def test_combined_fee_time_based():
    from app.orders.fees import combined_fee, split_fee
    assert combined_fee(20 * 60) == Decimal("2000.00")   # within 30-min window
    assert combined_fee(30 * 60) == Decimal("2000.00")   # exactly window
    assert combined_fee(45 * 60) == Decimal("2750.00")   # +15 min
    # split: company flat 1000, agent gets the rest incl. overtime
    sp = split_fee(45 * 60)
    assert sp["company"] == Decimal("1000.00")
    assert sp["agent"] == Decimal("1750.00")


@pytest.mark.asyncio
async def test_overtime_shopping_raises_fee_and_agent_share(client, db_session_factory):
    """Integration-level check that test_combined_fee_time_based (a pure
    function test) doesn't cover: finish_shopping must measure REAL elapsed
    wall-clock time from shopping_started_at, not read as ~0 seconds because
    start and finish happen back-to-back in a test. Fakes shopping_started_at
    45 minutes in the past (15 min of billable overtime) and asserts the fee
    - and agent_share specifically, since that's what the agent actually
    gets paid - rises by exactly 15 * PER_MINUTE.
    """
    from datetime import datetime, timedelta, timezone
    from app.orders.models import Order

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "500.00",
        "items": [{"description": "500 naira pepper"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]

    # Back-date shopping_started_at to land in the middle of minute 45 (44:30
    # elapsed, not exactly 45:00) - billable_minutes rounds UP
    # (math.ceil), so pinning to an exact minute boundary makes the test
    # flaky against ordinary test-execution jitter between here and
    # finish-shopping. 44:30 leaves ~30 seconds of margin either side while
    # still landing on the same billable_minutes=45 (15 min of overtime).
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        o.shopping_started_at = datetime.now(timezone.utc) - timedelta(minutes=44, seconds=30)
        await s.commit()

    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": "500.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    body = r.json()

    # 2000 base + 15 min * 50/min = 2750; company keeps a flat 1000 regardless,
    # so the entire 750 of overtime lands on the agent's share.
    assert Decimal(body["combined_fee"]) == Decimal("2750.00"), body
    assert Decimal(body["company_share"]) == Decimal("1000.00"), body
    assert Decimal(body["agent_share"]) == Decimal("1750.00"), body
    assert Decimal(body["grand_total"]) == Decimal("6850.00"), body  # 500 + 2750 + 3600

    print("Overtime shopping correctly raises the fee and lands on agent_share.")


def test_deposit_threshold_and_rate():
    from app.orders.fees import required_deposit, estimate_order_value
    def dep(goods):
        return required_deposit(Decimal(goods), estimate_order_value(Decimal(goods)))
    assert dep("2000") == Decimal("0.00")     # est 2000+3600+2000=7600, under 10k
    assert dep("4400") == Decimal("0.00")     # est exactly 10000, at threshold
    assert dep("80000") == Decimal("24000.00")   # est 85600 > 10k -> 30% of 80000
    # protection scales with order size
    assert dep("200000") == Decimal("60000.00")


# ---------- Deposit on a large order ----------

@pytest.mark.asyncio
async def test_large_order_requires_deposit(client, db_session_factory):
    admin_h, agent_h, agent_id, _, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "delivery_address": "12 Aba Road, Port Harcourt",
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    assert r.status_code == 201, r.text
    order = r.json()
    # estimate = 78000 items + 3600 delivery + 2000 combined base
    assert Decimal(order["estimated_value"]) == Decimal("83600.00")
    assert Decimal(order["deposit_amount"]) == Decimal("23400.00")
    assert order["delivery_address"] == "12 Aba Road, Port Harcourt"


@pytest.mark.asyncio
async def test_small_order_needs_no_deposit(client, db_session_factory):
    admin_h, _, _, _, market_id = await _setup(client, db_session_factory)
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "3000.00",
        "items": [{"description": "500 naira pepper"}],
    })
    assert Decimal(r.json()["deposit_amount"]) == Decimal("0.00")


# ---------- Refund case B: nothing found ----------

@pytest.mark.asyncio
async def test_nothing_found_refunds_whole_deposit(client, db_session_factory):
    from app.core.enums import OrderStatus
    from app.orders.models import Order
    from app.wallet import service as wallet_service

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    assert deposit == Decimal("23400.00")

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)
    await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)

    # Agent confirms NOTHING — market had none of it
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.CANCELLED
        balance = await wallet_service.get_balance(s, cust_id)
    assert balance == deposit, "whole deposit should be refunded to wallet"


# ---------- Customer cancellation before shopping (with refund) ----------

@pytest.mark.asyncio
async def test_customer_cancel_refunds_deposit_exactly_once(client, db_session_factory):
    """The cancel-before-shopping path delete_order's docstring pointed to
    but never existed - a paid deposit must come back to the wallet, and
    only ever once (no double-credit if the frontend retries the call)."""
    from app.core.enums import LedgerDirection, OrderStatus
    from app.orders.models import Order
    from app.wallet.models import WalletLedger
    from app.wallet import service as wallet_service

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    assert deposit == Decimal("23400.00")

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)

    # Balance after funding+paying the deposit is 0 (funded exactly `deposit`,
    # then spent it) - confirms the refund below is the ONLY credit in play.
    async with db_session_factory() as s:
        assert await wallet_service.get_balance(s, cust_id) == Decimal("0.00")

    r = await client.post(f"/orders/{oid}/cancel", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelled"

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.CANCELLED
        balance = await wallet_service.get_balance(s, cust_id)
        assert balance == deposit, "the paid deposit should be refunded to the wallet"

        # Exactly one refund CREDIT landed - not zero, not double-credited.
        # (The order also carries the earlier deposit-payment DEBIT under the
        # same order_id - that's the expected paired entry, not the refund.)
        result = await s.execute(
            select(WalletLedger).where(
                WalletLedger.order_id == uuid.UUID(oid),
                WalletLedger.direction == LedgerDirection.CREDIT,
            )
        )
        entries = result.scalars().all()
        assert len(entries) == 1
        assert entries[0].amount == deposit

    # Retrying the (already-cancelled) order must not refund a second time.
    r = await client.post(f"/orders/{oid}/cancel", headers=admin_h)
    assert r.status_code == 409, "cancelling an already-cancelled order must be rejected"
    async with db_session_factory() as s:
        assert await wallet_service.get_balance(s, cust_id) == deposit, "no double refund on retry"

    print("Cancel-before-shopping refunds the deposit exactly once.")


@pytest.mark.asyncio
async def test_cannot_cancel_once_shopping_started(client, db_session_factory):
    """Once SHOPPING has opened a spending authorization the agent is
    committed - cancel-with-refund is no longer available (a lapsed payment
    from here on is must_prepay/loss territory, not a customer cancel)."""
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, r.text

    r = await client.post(f"/orders/{oid}/cancel", headers=admin_h)
    assert r.status_code == 409, "cannot cancel-with-refund once shopping has started"

    print("Cancellation correctly blocked once shopping has started.")


# ---------- Deposit forfeiture: lapsed balance payment (NOT a refund case) ----------

@pytest.mark.asyncio
async def test_lapsed_balance_payment_forfeits_deposit(client, db_session_factory):
    """The deposit is refunded ONLY on the two documented cases above
    (nothing found, bargained-total below the deposit) - never for a
    customer simply failing to pay the balance in time. A lapsed payment
    window is the customer's own non-payment after the agent already spent
    real money at the market; the company doesn't owe that back.
    """
    from datetime import datetime, timedelta, timezone
    from app.auth.models import User
    from app.core.enums import OrderStatus
    from app.orders.models import Order
    from app.payments import service as payments_service
    from app.wallet import service as wallet_service

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    assert deposit == Decimal("23400.00")

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)

    async with db_session_factory() as s:
        balance_after_deposit = await wallet_service.get_balance(s, cust_id)

    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": "78000.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "awaiting_payment"

    # Force the payment window into the past (same technique as
    # test_stale_order_auto_cancels in test_payments.py).
    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        o.payment_window_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()

    async with db_session_factory() as s:
        count = await payments_service.expire_stale_orders(s)
        await s.commit()
    assert count == 1

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.CANCELLED_UNPAID
        assert o.deposit_amount == deposit, "deposit must stay recorded, not zeroed"
        assert o.deposit_paid_at is not None, "still recorded as paid, never rolled back"

        cust = (await s.execute(select(User).where(User.id == cust_id))).scalar_one()
        assert cust.must_prepay is True
        assert cust.non_payment_count == 1

        balance_after_expiry = await wallet_service.get_balance(s, cust_id)
    # The deposit is forfeited, not refunded - expire_stale_orders must NOT
    # have credited the wallet.
    assert balance_after_expiry == balance_after_deposit

    print("Lapsed balance payment correctly forfeits the deposit - no wallet credit.")


# ---------- Refund case A: total below deposit ----------

@pytest.mark.asyncio
async def test_partial_shortfall_credits_wallet(client, db_session_factory, monkeypatch):
    from app.wallet import service as wallet_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}, {"description": "yams"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])  # 23400

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]

    # Only ONE cheap item was actually available
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "2000.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    final = r.json()

    grand = Decimal(final["grand_total"])  # 2000 items + 2000 fee + 3600 delivery = 7600
    assert grand == Decimal("7600.00")
    expected_refund = deposit - grand  # 23400 - 7600 = 15800

    async with db_session_factory() as s:
        balance = await wallet_service.get_balance(s, cust_id)
    assert balance == expected_refund, "difference should be refunded"


# ---------- Bargained list ----------

@pytest.mark.asyncio
async def test_bargained_list_shows_real_prices(client, db_session_factory, monkeypatch):
    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, _, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "2000.00",
        "items": [{"description": "500 naira pepper"}, {"description": "rare spice"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]

    # agent bargained pepper down to 450; second item unavailable
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "450.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    r = await client.get(f"/orders/{oid}/bargained-list", headers=admin_h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert Decimal(data["items_total"]) == Decimal("450.00")
    assert Decimal(data["combined_fee"]) == Decimal("2000.00")
    found = {i["description"]: i["found"] for i in data["items"]}
    assert found["500 naira pepper"] is True
    assert found["rare spice"] is False
    # no deposit on this small order, so amount due == grand total
    assert Decimal(data["amount_due"]) == Decimal(data["grand_total"])


# ---------- Wallet as a payment option ----------

@pytest.mark.asyncio
async def test_pay_from_wallet(client, db_session_factory, monkeypatch):
    from app.core.enums import OrderStatus
    from app.orders.models import Order
    from app.wallet import service as wallet_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    # fund the wallet
    r = await client.post("/wallet/fund", headers=admin_h, json={"amount": "10000.00"})
    assert Decimal(r.json()["balance"]) == Decimal("10000.00")

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "1500.00",
        "items": [{"description": "500 naira pepper"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    grand = Decimal(r.json()["grand_total"])  # 1500 + 2000 + 3600 = 7100

    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=admin_h)
    assert r.status_code == 200, r.text

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        assert o.status is OrderStatus.PAID
        balance = await wallet_service.get_balance(s, cust_id)
    assert balance == Decimal("10000.00") - grand


@pytest.mark.asyncio
async def test_wallet_insufficient_balance_rejected(client, db_session_factory, monkeypatch):
    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    admin_h, agent_h, agent_id, _, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "1500.00",
        "items": [{"description": "500 naira pepper"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    items = r.json()["items"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    # wallet is empty -> must be told to top up or pay by bank
    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=admin_h)
    assert r.status_code == 402, r.text


# ---------- The deposit-leak fix ----------

@pytest.mark.asyncio
async def test_shopping_blocked_until_deposit_paid(client, db_session_factory):
    """A large order cannot start shopping until its deposit is collected."""
    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}],
    })
    oid = r.json()["id"]
    assert Decimal(r.json()["deposit_amount"]) == Decimal("23400.00")

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})

    # Without paying the deposit, shopping must be refused
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 402, "shopping should be blocked until deposit paid"

    # Pay it, then shopping is allowed
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, Decimal("23400.00"))
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_deposit_credits_float_pool(client, db_session_factory):
    """A paid deposit is real money — it lands in the float pool."""
    from app.float import service as float_service

    admin_h, agent_h, agent_id, cust_id, market_id = await _setup(client, db_session_factory)

    async with db_session_factory() as s:
        pool_before = await float_service.get_pool_balance(s, market_id)

    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "78000.00",
        "items": [{"description": "rice"}],
    })
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    await _pay_deposit(client, db_session_factory, oid, cust_id, admin_h, deposit)

    async with db_session_factory() as s:
        pool_after = await float_service.get_pool_balance(s, market_id)
    assert pool_after - pool_before == deposit, "deposit should credit the pool"


@pytest.mark.asyncio
async def test_small_order_shops_without_deposit(client, db_session_factory):
    """An order below the threshold needs no deposit and shops freely."""
    admin_h, agent_h, agent_id, _, market_id = await _setup(client, db_session_factory)
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id),
        "listed_items_total": "3000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    assert Decimal(r.json()["deposit_amount"]) == Decimal("0.00")
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    assert r.status_code == 200, "no-deposit order should shop freely"
