"""JIT layer: authorization caps, vendor transfers as prices, safety, overage."""

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


async def _setup(client, db_session_factory, monkeypatch, pool="500000"):
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market

    # Mock the transfer rail so no real network call happens.
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
            s, direction=LedgerDirection.CREDIT, amount=Decimal(pool),
            market_id=market.id, note="seed")
        await s.commit()
        market_id, agent_uid, cust_id = market.id, agent_u.id, cust.id
    return (
        {"Authorization": f"Bearer {cust_token}"},
        {"Authorization": f"Bearer {agent_token}"},
        market_id, agent_uid, cust_id,
    )


async def _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00", items=None):
    items = items or [{"description": "pepper"}, {"description": "rice"}]
    r = await client.post("/orders", headers=admin_h, json={
        "market_id": str(market_id), "listed_items_total": listed, "items": items})
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    if deposit > 0:
        # accept-agent is gated on the deposit being paid - fund and pay it
        # via the same dev-only wallet shortcut other suites use, so orders
        # over the threshold can still reach shopping in these tests.
        r = await client.post("/wallet/fund", headers=admin_h, json={"amount": str(deposit)})
        assert r.status_code == 200, r.text
        r = await client.post(f"/payments/orders/{oid}/deposit/pay-from-wallet", headers=admin_h)
        assert r.status_code == 200, r.text
    # Phase 1: the agent is only PROPOSED at creation - accept before shopping can start.
    r = await client.post(f"/orders/{oid}/accept-agent", headers=admin_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    return oid, r.json()["items"]


@pytest.mark.asyncio
async def test_transfer_becomes_the_price(client, db_session_factory, monkeypatch):
    from app.orders.models import OrderItem
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id)

    # Agent pays a vendor 3000 for the pepper. The item price BECOMES 3000.
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "3000.00"}],
    })
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["amount"]) == Decimal("3000.00")

    async with db_session_factory() as s:
        it = (await s.execute(select(OrderItem).where(OrderItem.id == uuid.UUID(items[0]["id"])))).scalar_one()
        assert it.confirmed_price == Decimal("3000.00"), "price should equal the transfer"


@pytest.mark.asyncio
async def test_authorization_cap_equals_goods_estimate(client, db_session_factory, monkeypatch):
    """(#9) The cap must be the GOODS estimate only - never goods + delivery
    + fee. Neither delivery nor the fee is ever paid through this
    authorization, so including them would let an agent overspend real
    goods money by roughly a delivery-quote's worth."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="7500.00")

    r = await client.get(f"/jit/orders/{oid}/authorization", headers=admin_h)
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["cap"]) == Decimal("7500.00"), "cap must equal the goods estimate exactly"

    r = await client.get(f"/orders/{oid}", headers=admin_h)
    order = r.json()
    assert Decimal(order["goods_estimate"]) == Decimal("7500.00")
    # estimated_value is the COMBINED figure (goods + delivery + fee) - and
    # is deliberately larger than the cap, confirming the cap isn't keyed
    # off it.
    assert Decimal(order["estimated_value"]) == Decimal("7500.00") + Decimal("3600.00") + Decimal("2000.00")

    print("Spending authorization cap correctly equals the goods estimate only.")


@pytest.mark.asyncio
async def test_authorization_cap_blocks_overspend(client, db_session_factory, monkeypatch):
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    # listed 5000 -> goods-only cap = 5000 (see #9 - never the combined estimate)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    # Try to pay more than the cap in one go
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "20000.00"}],
    })
    assert r.status_code == 402, "over-cap transfer must be rejected"

    # The 402 must not swallow the customer notification: the request "fails"
    # but the notice that an approval is needed has to survive that failure.
    r = await client.get("/notifications", headers=admin_h)
    assert r.status_code == 200, r.text
    kinds = [n["kind"] for n in r.json()]
    assert "overage_approval" in kinds, (
        "hitting the cap must notify the customer, even though pay-vendor 402s"
    )


@pytest.mark.asyncio
async def test_customer_raises_cap_then_transfer_allowed(client, db_session_factory, monkeypatch):
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    # listed 5000 -> goods-only cap = 5000.00
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    # spend most of the cap
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "3000.00"}]})
    assert r.status_code == 200, r.text

    # next transfer would exceed the 5000 cap (3000 + 3000 = 6000)
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[1]["id"], "price": "3000.00"}]})
    assert r.status_code == 402

    # customer approves a raise of 6000
    r = await client.post(f"/jit/orders/{oid}/authorization/raise", headers=admin_h,
                          json={"extra": "6000.00"})
    assert r.status_code == 200
    assert Decimal(r.json()["cap"]) == Decimal("11000.00")

    # now the transfer goes through
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[1]["id"], "price": "3000.00"}]})
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_per_transfer_safety_cap(client, db_session_factory, monkeypatch):
    from app.core.config import settings
    settings.max_transfer_naira = 100_000
    # give a huge order cap so only the SAFETY cap can block it
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch, pool="5000000")
    # small no-deposit order, then customer raises the cap sky-high so ONLY the
    # per-transfer safety cap can block the payment.
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="20000.00")
    await client.post(f"/jit/orders/{oid}/authorization/raise", headers=admin_h,
                      json={"extra": "1000000.00"})
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "150000.00"}]})
    assert r.status_code == 400, "over the per-transfer safety cap"


@pytest.mark.asyncio
async def test_emtl_debits_pool_on_large_transfer(client, db_session_factory, monkeypatch):
    from app.float import service as float_service
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="20000.00")

    async with db_session_factory() as s:
        before = await float_service.get_pool_balance(s, market_id)

    # 15000 transfer -> pool drops by 15000 + 50 EMTL
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "15000.00"}]})
    assert r.status_code == 200, r.text

    async with db_session_factory() as s:
        after = await float_service.get_pool_balance(s, market_id)
    assert before - after == Decimal("15050.00"), "pool should drop by goods + EMTL"


@pytest.mark.asyncio
async def test_purchase_photos_exposed_to_participants_only(client, db_session_factory, monkeypatch):
    """Each vendor_transfer's photo_ref (purchase photo per stall) must be
    visible to the order's customer and assigned agent, and to no one else -
    same participant gate as chat."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "3000.00"}],
        "photo_ref": "https://cdn.example.com/receipts/stall1.jpg"})
    assert r.status_code == 200, r.text

    # Customer sees the receipt, with its photo.
    r = await client.get(f"/jit/orders/{oid}/purchases", headers=admin_h)
    assert r.status_code == 200, r.text
    purchases = r.json()
    assert len(purchases) == 1
    assert purchases[0]["amount"] == "3000.00"
    assert purchases[0]["photo_ref"] == "https://cdn.example.com/receipts/stall1.jpg"
    assert purchases[0]["status"] == "success"

    # The assigned agent sees the same thing.
    r = await client.get(f"/jit/orders/{oid}/purchases", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()[0]["photo_ref"] == "https://cdn.example.com/receipts/stall1.jpg"

    # A stranger cannot.
    stranger_token = await _login(client, "+2348099998888")
    stranger_h = {"Authorization": f"Bearer {stranger_token}"}
    r = await client.get(f"/jit/orders/{oid}/purchases", headers=stranger_h)
    assert r.status_code == 403, "only the order's own customer/agent may see purchase photos"

    print("Purchase photos correctly exposed to participants only.")


@pytest.mark.asyncio
async def test_items_keep_their_own_typed_price_not_an_even_split(client, db_session_factory, monkeypatch):
    """(#8) Each covered item records WHICH transfer confirmed its price
    (so the customer-facing checklist can show the right stall photo next to
    the right item) AND its own agent-typed price - never an even split of
    the transfer total. Three items, three different prices, none of them
    anywhere near amount/3."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(
        client, admin_h, agent_h, market_id, listed="5000.00",
        items=[{"description": "pepper"}, {"description": "rice"}, {"description": "beans"}],
    )

    # One transfer covers all THREE items (bought together at the same
    # stall) with three DIFFERENT agent-typed prices summing to 4000 - an
    # even split would wrongly give each item 1333.33.
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [
            {"item_id": items[0]["id"], "price": "2000.00"},
            {"item_id": items[1]["id"], "price": "1500.00"},
            {"item_id": items[2]["id"], "price": "500.00"},
        ],
        "photo_ref": "https://cdn.example.com/receipts/stall-batch.jpg"})
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["amount"]) == Decimal("4000.00"), "transfer amount is the SUM of the typed prices"
    transfer_id = r.json()["id"]

    r = await client.get(f"/orders/{oid}", headers=admin_h)
    confirmed = {it["id"]: it for it in r.json()["items"]}
    assert confirmed[items[0]["id"]]["confirmed_price"] == "2000.00"
    assert confirmed[items[1]["id"]]["confirmed_price"] == "1500.00"
    assert confirmed[items[2]["id"]]["confirmed_price"] == "500.00"
    for it in confirmed.values():
        assert it["vendor_transfer_id"] == transfer_id, "all three items should link to the one shared transfer"

    r = await client.get(f"/jit/orders/{oid}/purchases", headers=admin_h)
    assert r.json()[0]["photo_ref"] == "https://cdn.example.com/receipts/stall-batch.jpg"

    print("Items keep their own typed price (no even-split fabrication) and all link to the shared transfer.")


@pytest.mark.asyncio
async def test_pay_vendor_rejects_item_not_on_order(client, db_session_factory, monkeypatch):
    """A price entry for an item that isn't actually on this order must be
    rejected outright, not silently ignored (the old item_ids-filter
    approach would have just dropped it with no error)."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": str(uuid.uuid4()), "price": "1000.00"}]})
    assert r.status_code == 400, "an item id that isn't on the order must be rejected"


# ---------- Purchase photo required (per transfer) ----------

@pytest.mark.asyncio
async def test_transfer_never_blocked_on_missing_photo(client, db_session_factory, monkeypatch):
    """The money side of the "required" policy: pay-vendor must succeed with
    NO photo at all - a slow/failed upload in a weak-signal market must
    never hold up a real transfer."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    assert r.status_code == 200, r.text
    assert r.json()["photo_ref"] is None


@pytest.mark.asyncio
async def test_finish_shopping_blocked_until_photo_attached(client, db_session_factory, monkeypatch):
    """The enforcement side: finish-shopping refuses while any successful
    transfer is still missing its photo, and succeeds the moment the agent
    attaches one via the deferred attach-photo endpoint."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    assert r.status_code == 200, r.text
    transfer_id = r.json()["id"]

    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 409, "must refuse to finish while a purchase has no photo"

    r = await client.post(
        f"/jit/orders/{oid}/purchases/{transfer_id}/photo", headers=agent_h,
        json={"photo_ref": "https://cdn.example.com/receipts/late.jpg"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["photo_ref"] == "https://cdn.example.com/receipts/late.jpg"

    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text

    print("Finish-shopping is correctly blocked until every purchase has a photo, never the transfer itself.")


@pytest.mark.asyncio
async def test_finish_shopping_blocked_reports_every_missing_purchase(client, db_session_factory, monkeypatch):
    """Multiple stalls, only one photographed - finishing must still be
    refused (not satisfied by partial coverage)."""
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    assert r.status_code == 200, r.text

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "8023456789", "bank_code": "999992",
        "items": [{"item_id": items[1]["id"], "price": "1000.00"}]})
    assert r.status_code == 200, r.text

    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 409, "one un-photographed purchase must still block finishing"


@pytest.mark.asyncio
async def test_only_assigned_agent_can_attach_photo(client, db_session_factory, monkeypatch):
    admin_h, agent_h, market_id, agent_uid, _ = await _setup(client, db_session_factory, monkeypatch)
    oid, items = await _order_shopping(client, admin_h, agent_h, market_id, listed="5000.00")

    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": items[0]["id"], "price": "1500.00"}]})
    transfer_id = r.json()["id"]

    stranger_token = await _login(client, "+2348010000099")
    stranger_h = {"Authorization": f"Bearer {stranger_token}"}
    r = await client.post(
        f"/jit/orders/{oid}/purchases/{transfer_id}/photo", headers=stranger_h,
        json={"photo_ref": "https://cdn.example.com/receipts/late.jpg"},
    )
    assert r.status_code == 403
