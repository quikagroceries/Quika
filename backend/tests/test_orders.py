import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"
PHONE_CUST_B = "+2348010000009"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"identifier": phone, "code": code})
    token = r.json()["access_token"]
    return token




@pytest.mark.asyncio
async def test_full_order_lifecycle(client, db_session_factory, seed_float, monkeypatch):
    from app.auth.models import User
    from app.core.enums import OrderStatus, UserRole
    from app.float import service as float_service

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr("app.payments.transfers.send_transfer", fake_send)

    # --- seed a market and two users (customer + agent) ---
    market_id = uuid.uuid4()

    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)

    # promote the agent user to AGENT role, and make a fake admin
    async with db_session_factory() as s:
        agent_user = (
            await s.execute(select(User).where(User.phone == PHONE_AGENT))
        ).scalar_one()
        agent_user.role = UserRole.AGENT
        cust_user = (
            await s.execute(select(User).where(User.phone == PHONE_CUST))
        ).scalar_one()
        cust_user.role = UserRole.ADMIN  # reuse customer as admin for assign step
        await s.commit()
        agent_user_id = agent_user.id

    admin_headers = {"Authorization": f"Bearer {cust_token}"}
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    # --- seed the float pool with 100,000 naira ---
    async with db_session_factory() as s:
        await float_service.record_movement(
            s,
            direction=__import__(
                "app.core.enums", fromlist=["LedgerDirection"]
            ).LedgerDirection.CREDIT,
            amount=Decimal("100000.00"),
            market_id=market_id,
            note="Initial float top-up",
        )
        await s.commit()

    # --- customer creates an order ---
    r = await client.post(
        "/orders",
        headers=admin_headers,
        json={
            "market_id": str(market_id),
            # A real goods estimate, comfortably covering the 500+1000
            # vendor payments below - the spending cap is goods-only (#9),
            # so an order with no listed_items_total/listed_price at all
            # would have a ZERO cap and every payment below would 402.
            "listed_items_total": "2000.00",
            "items": [
                {"description": "500 naira pepper", "requested_note": "ripe"},
                {"description": "1000 naira rice"},
            ],
        },
    )
    assert r.status_code == 201, r.text
    order = r.json()
    order_id = order["id"]
    assert order["status"] == "draft"
    assert len(order["items"]) == 2

    # --- admin assigns the agent ---
    r = await client.post(
        f"/orders/{order_id}/assign-agent",
        headers=admin_headers,
        json={"agent_id": str(agent_user_id)},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "agent_assigned"

    # --- agent starts shopping ---
    r = await client.post(
        f"/orders/{order_id}/start-shopping", headers=agent_headers
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "shopping"

    # --- agent pays vendors for each item; float pool should drop ---
    async with db_session_factory() as s:
        before = await float_service.get_pool_balance(s, market_id)

    items = r.json()["items"]
    r = await client.post(
        f"/jit/orders/{order_id}/pay-vendor",
        headers=agent_headers,
        json={
            "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
            "items": [{"item_id": items[0]["id"], "price": "500.00"}],
        },
    )
    assert r.status_code == 200, r.text
    r = await client.post(
        f"/jit/orders/{order_id}/pay-vendor",
        headers=agent_headers,
        json={
            "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
            "items": [{"item_id": items[1]["id"], "price": "1000.00"}],
        },
    )
    assert r.status_code == 200, r.text

    async with db_session_factory() as s:
        after = await float_service.get_pool_balance(s, market_id)
    assert before - after == Decimal("1500.00"), f"float not debited: {before}->{after}"

    # --- agent finishes shopping: fees computed, payment window opens ---
    r = await client.post(
        f"/orders/{order_id}/finish-shopping", headers=agent_headers
    )
    assert r.status_code == 200, r.text
    final = r.json()
    assert final["status"] == "awaiting_payment"
    assert Decimal(final["items_total"]) == Decimal("1500.00")
    # fees: items 1500 + combined fee 2000 (<30min) + delivery 3600 + emtl 0 = 7100
    assert Decimal(final["grand_total"]) == Decimal("7100.00"), final
    assert final["payment_window_expires_at"] is not None

    # --- agent can list their own assigned orders ---
    r = await client.get("/orders/mine", headers=agent_headers)
    assert r.status_code == 200, r.text
    mine = r.json()
    assert len(mine) == 1
    assert mine[0]["id"] == order_id

    # --- customer (not an agent) is forbidden from the agent endpoint ---
    r = await client.get("/orders/mine", headers=admin_headers)
    assert r.status_code == 403

    print("Order lifecycle + float debit + fee calc all correct.")


@pytest.mark.asyncio
async def test_customer_can_list_own_orders_only(client):
    market_id = uuid.uuid4()

    cust_a_token = await _login(client, PHONE_CUST)
    cust_b_token = await _login(client, PHONE_CUST_B)
    cust_a_headers = {"Authorization": f"Bearer {cust_a_token}"}
    cust_b_headers = {"Authorization": f"Bearer {cust_b_token}"}

    r = await client.post(
        "/orders",
        headers=cust_a_headers,
        json={"market_id": str(market_id), "items": [{"description": "500 naira pepper"}]},
    )
    assert r.status_code == 201, r.text
    order_a_id = r.json()["id"]

    r = await client.post(
        "/orders",
        headers=cust_b_headers,
        json={"market_id": str(market_id), "items": [{"description": "1000 naira rice"}]},
    )
    assert r.status_code == 201, r.text
    order_b_id = r.json()["id"]

    r = await client.get("/orders/mine-customer", headers=cust_a_headers)
    assert r.status_code == 200, r.text
    mine_a = r.json()
    ids_a = [o["id"] for o in mine_a]
    assert order_a_id in ids_a
    assert order_b_id not in ids_a

    r = await client.get("/orders/mine-customer", headers=cust_b_headers)
    assert r.status_code == 200, r.text
    mine_b = r.json()
    ids_b = [o["id"] for o in mine_b]
    assert order_b_id in ids_b
    assert order_a_id not in ids_b


@pytest.mark.asyncio
async def test_itemized_prices_drive_estimate_deposit_and_cap(client, db_session_factory):
    """Per-item listed_price -> summed listed_items_total -> estimated_value
    -> deposit_amount, AND (the whole point) the JIT spending cap, which is
    sourced from the GOODS-only estimate (#9) - never estimated_value, which
    also folds in delivery + the combined fee. Without itemized prices this
    order would fall back to a ZERO goods cap and 402 on the first real
    vendor payment - this proves the cap reflects the real goods total.
    """
    from app.auth.models import User
    from app.core.enums import UserRole

    market_id = uuid.uuid4()
    cust_token = await _login(client, PHONE_CUST)
    agent_token = await _login(client, PHONE_AGENT)

    async with db_session_factory() as s:
        agent_user = (
            await s.execute(select(User).where(User.phone == PHONE_AGENT))
        ).scalar_one()
        agent_user.role = UserRole.AGENT
        cust_user = (
            await s.execute(select(User).where(User.phone == PHONE_CUST))
        ).scalar_one()
        cust_user.role = UserRole.ADMIN  # reuse customer as admin for assign step
        await s.commit()
        agent_user_id = agent_user.id

    admin_headers = {"Authorization": f"Bearer {cust_token}"}
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    # Goods total 40,000 -> well past the 10,000 deposit threshold.
    r = await client.post(
        "/orders",
        headers=admin_headers,
        json={
            "market_id": str(market_id),
            "items": [
                {"description": "rice", "listed_price": "25000.00"},
                {"description": "beans", "listed_price": "15000.00"},
            ],
        },
    )
    assert r.status_code == 201, r.text
    order = r.json()
    order_id = order["id"]

    # estimate = 40000 (goods) + 3600 (delivery) + 2000 (combined fee) = 45600
    assert Decimal(order["estimated_value"]) == Decimal("45600.00"), order
    # deposit = 30% of the GOODS total (40000), not the grand estimate.
    assert Decimal(order["deposit_amount"]) == Decimal("12000.00"), order

    # No Market row exists for this random market_id, so auto-assign can't
    # fire - assign manually via the same public endpoint the admin UI uses.
    r = await client.post(
        f"/orders/{order_id}/assign-agent",
        headers=admin_headers,
        json={"agent_id": str(agent_user_id)},
    )
    assert r.status_code == 200, r.text

    # Pay the deposit (dev wallet-fund shortcut) so start-shopping's gate
    # doesn't block this check.
    r = await client.post(
        "/wallet/fund", headers=admin_headers, json={"amount": "12000.00"}
    )
    assert r.status_code == 200, r.text
    r = await client.post(
        f"/payments/orders/{order_id}/deposit/pay-from-wallet", headers=admin_headers
    )
    assert r.status_code == 200, r.text

    r = await client.post(f"/orders/{order_id}/start-shopping", headers=agent_headers)
    assert r.status_code == 200, r.text

    # The whole point: the JIT cap is sourced from the real GOODS estimate
    # (40000 = 25000 + 15000) - never the combined estimated_value (45600),
    # which also includes delivery + fee that are never paid through this
    # authorization at all.
    r = await client.get(f"/jit/orders/{order_id}/authorization", headers=admin_headers)
    assert r.status_code == 200, r.text
    assert Decimal(r.json()["cap"]) == Decimal("40000.00"), (
        "cap should equal the goods-only itemized estimate, not the combined estimated_value"
    )


@pytest.mark.asyncio
async def test_draft_list_can_be_edited_and_is_repriced(client):
    token = await _login(client, PHONE_CUST)
    auth = {"Authorization": f"Bearer {token}"}
    market_id = str(uuid.uuid4())
    r = await client.post(
        "/orders",
        headers=auth,
        json={"market_id": market_id, "items": [{"description": "Beans", "listed_price": "1000.00"}]},
    )
    assert r.status_code == 201
    order = r.json()
    # No agent exists in this fixture, so the order stays a draft.
    assert order["status"] == "draft"

    r = await client.put(
        f"/orders/{order['id']}/draft",
        headers=auth,
        json={
            "listed_items_total": "1500.00",
            "items": [
                {"description": "Rice", "listed_price": "6000.00", "quantity": 2},
                {"description": "Ugu leaves"},
            ],
        },
    )
    assert r.status_code == 200
    edited = r.json()
    assert [i["description"] for i in edited["items"]] == ["Rice", "Ugu leaves"]
    # 6000 priced + 1500 budget, same pricing rules as order creation.
    assert Decimal(edited["goods_estimate"]) == Decimal("7500.00")
    assert Decimal(edited["estimated_value"]) == Decimal("13100.00")


@pytest.mark.asyncio
async def test_only_owner_can_edit_a_draft_list(client):
    owner = await _login(client, PHONE_CUST)
    other = await _login(client, PHONE_CUST_B)
    r = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {owner}"},
        json={"market_id": str(uuid.uuid4()), "items": [{"description": "Beans", "listed_price": "1000.00"}]},
    )
    order_id = r.json()["id"]
    r = await client.put(
        f"/orders/{order_id}/draft",
        headers={"Authorization": f"Bearer {other}"},
        json={"items": [{"description": "Stolen", "listed_price": "1.00"}]},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_order_keeps_the_delivery_pin(client):
    token = await _login(client, PHONE_CUST)
    r = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "market_id": str(uuid.uuid4()),
            "delivery_address": "12 Allen Avenue, Ikeja",
            "dropoff_latitude": 6.6018,
            "dropoff_longitude": 3.3515,
            "items": [{"description": "Beans", "listed_price": "1000.00"}],
        },
    )
    assert r.status_code == 201
    assert r.json()["dropoff_latitude"] == 6.6018
    assert r.json()["dropoff_longitude"] == 3.3515
    # Out-of-range coordinates are rejected, not stored.
    r = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {token}"},
        json={"market_id": str(uuid.uuid4()), "dropoff_latitude": 123, "items": [{"description": "x"}]},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_assigned_agent_card_is_customer_only_and_empty_until_assigned(client):
    owner = await _login(client, PHONE_CUST)
    other = await _login(client, PHONE_CUST_B)
    r = await client.post(
        "/orders",
        headers={"Authorization": f"Bearer {owner}"},
        json={"market_id": str(uuid.uuid4()), "items": [{"description": "Beans", "listed_price": "1000.00"}]},
    )
    order_id = r.json()["id"]
    # No agent has accepted yet.
    r = await client.get(f"/orders/{order_id}/agent", headers={"Authorization": f"Bearer {owner}"})
    assert r.status_code == 200 and r.json() is None
    # Nobody else can read it.
    r = await client.get(f"/orders/{order_id}/agent", headers={"Authorization": f"Bearer {other}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_messages_inbox_unread_counts_are_per_person(client, db_session_factory):
    from app.auth.models import User
    from app.orders.models import Order

    cust = await _login(client, PHONE_CUST)
    agent = await _login(client, PHONE_AGENT)
    hc = {"Authorization": f"Bearer {cust}"}
    ha = {"Authorization": f"Bearer {agent}"}

    r = await client.post(
        "/orders",
        headers=hc,
        json={"market_id": str(uuid.uuid4()), "items": [{"description": "Beans", "listed_price": "1000.00"}]},
    )
    order_id = r.json()["id"]

    # An order with no messages isn't a conversation yet.
    assert (await client.get("/chat/conversations", headers=hc)).json() == []

    # Put the agent on the order (assignment is covered elsewhere).
    async with db_session_factory() as s:
        agent_user = (await s.execute(select(User).where(User.phone == PHONE_AGENT))).scalar_one()
        order = (await s.execute(select(Order).where(Order.id == uuid.UUID(order_id)))).scalar_one()
        order.agent_id = agent_user.id
        await s.commit()

    await client.post(f"/orders/{order_id}/messages", headers=hc, json={"text": "Hello agent"})
    await client.post(f"/orders/{order_id}/messages", headers=ha, json={"text": "On it"})
    await client.post(f"/orders/{order_id}/messages", headers=ha, json={"image_url": "https://res.cloudinary.com/x/y.jpg"})

    # Customer: two unread from the agent. (Which message is "last" isn't
    # asserted: the SQLite test DB stamps whole seconds, so three messages
    # sent together tie - Postgres has microsecond precision.)
    (c,) = (await client.get("/chat/conversations", headers=hc)).json()
    assert c["unread"] == 2 and c["last_message"] is not None
    # Agent: one unread (the customer's hello) - counts are per person.
    (a,) = (await client.get("/chat/conversations", headers=ha)).json()
    assert a["unread"] == 1

    # Reading clears only the reader's count.
    assert (await client.post(f"/orders/{order_id}/messages/read", headers=hc)).status_code == 204
    (c,) = (await client.get("/chat/conversations", headers=hc)).json()
    (a,) = (await client.get("/chat/conversations", headers=ha)).json()
    assert c["unread"] == 0 and a["unread"] == 1

    # A stranger can neither read nor mark it.
    other = await _login(client, PHONE_CUST_B)
    ho = {"Authorization": f"Bearer {other}"}
    assert (await client.post(f"/orders/{order_id}/messages/read", headers=ho)).status_code == 403
    assert (await client.get("/chat/conversations", headers=ho)).json() == []
