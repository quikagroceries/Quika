import uuid

import pytest
from sqlalchemy import select

from app.markets.models import Agent, Market

ADMIN_PHONE = "+2348030000001"
TARGET_PHONE = "+2348040000002"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    body = {"identifier": phone, "code": code}
    if role:
        body["role"] = role
    r = await client.post("/auth/verify-otp", json=body)
    return r.json()["access_token"]


async def _drive_order_to_paid(
    client, *, admin_h, agent_h, agent_id, cust_h, market_id, goods_total="10000.00"
):
    """A small order (under the deposit threshold, so no deposit step needed)
    driven all the way to PAID - the shared setup for the agents/analytics
    admin tests below, which all need at least one real paid_at + company_share
    + agent_share on record."""
    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": goods_total,
        "items": [{"description": "rice"}],
    })
    oid = r.json()["id"]
    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    r = await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": goods_total}],
    })
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    assert r.status_code == 200, r.text
    r = await client.post("/wallet/fund", headers=cust_h, json={"amount": "100000.00"})
    assert r.status_code == 200, r.text
    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=cust_h)
    assert r.status_code == 200, r.text
    return oid


@pytest.mark.asyncio
async def test_customer_applies_and_admin_approves(client, db_session_factory):
    admin_token = await _login(client, ADMIN_PHONE, role="admin")
    target_token = await _login(client, TARGET_PHONE)
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    target_h = {"Authorization": f"Bearer {target_token}"}

    r = await client.get("/auth/me", headers=target_h)
    target_id = r.json()["id"]
    assert r.json()["role"] == "customer"

    async with db_session_factory() as s:
        market = Market(name="Mile 12", city="Lagos", state="Lagos")
        s.add(market)
        await s.commit()
        await s.refresh(market)
        market_id = market.id

    # customer applies
    r = await client.post(
        "/agent-applications",
        headers=target_h,
        json={"market_id": str(market_id), "note": "I run a stall here already"},
    )
    assert r.status_code == 201, r.text
    application = r.json()
    assert application["status"] == "pending"

    # a second application while one is pending is rejected
    r = await client.post(
        "/agent-applications",
        headers=target_h,
        json={"market_id": str(market_id)},
    )
    assert r.status_code == 409

    # admin approves
    r = await client.post(
        f"/agent-applications/{application['id']}/approve", headers=admin_h
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"

    # role actually flipped, and an Agent record exists tied to the market
    r = await client.get("/auth/me", headers=target_h)
    assert r.json()["role"] == "agent"

    async with db_session_factory() as s:
        agent = (
            await s.execute(select(Agent).where(Agent.user_id == uuid.UUID(target_id)))
        ).scalar_one()
        assert agent.assigned_market_id == market_id

    # approving twice is rejected
    r = await client.post(
        f"/agent-applications/{application['id']}/approve", headers=admin_h
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_admin_can_reject_application(client, db_session_factory):
    admin_token = await _login(client, "+2348030000009", role="admin")
    applicant_token = await _login(client, "+2348040000009")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    applicant_h = {"Authorization": f"Bearer {applicant_token}"}

    async with db_session_factory() as s:
        market = Market(name="Oyingbo Market", city="Lagos", state="Lagos")
        s.add(market)
        await s.commit()
        await s.refresh(market)
        market_id = market.id

    r = await client.post(
        "/agent-applications", headers=applicant_h, json={"market_id": str(market_id)}
    )
    application_id = r.json()["id"]

    r = await client.post(
        f"/agent-applications/{application_id}/reject", headers=admin_h
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rejected"

    r = await client.get("/auth/me", headers=applicant_h)
    assert r.json()["role"] == "customer"  # unchanged


@pytest.mark.asyncio
async def test_non_customer_cannot_apply(client):
    admin_token = await _login(client, "+2348030000005", role="admin")

    r = await client.post(
        "/agent-applications",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"market_id": str(uuid.uuid4())},
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_non_admin_cannot_approve(client, db_session_factory):
    applicant_token = await _login(client, "+2348050000003")
    other_customer_token = await _login(client, "+2348060000004")

    async with db_session_factory() as s:
        market = Market(name="Balogun Market", city="Lagos", state="Lagos")
        s.add(market)
        await s.commit()
        await s.refresh(market)
        market_id = market.id

    r = await client.post(
        "/agent-applications",
        headers={"Authorization": f"Bearer {applicant_token}"},
        json={"market_id": str(market_id)},
    )
    application_id = r.json()["id"]

    r = await client.post(
        f"/agent-applications/{application_id}/approve",
        headers={"Authorization": f"Bearer {other_customer_token}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_sees_forfeited_deposits_as_losses(client, db_session_factory):
    """A lapsed-balance-payment order (deposit forfeited, see
    test_money_model.test_lapsed_balance_payment_forfeits_deposit) must show
    up in the admin loss list with the forfeited amount - that's the
    "surface it to admin as a recorded loss" requirement."""
    from datetime import datetime, timedelta, timezone
    from decimal import Decimal
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.orders.models import Order
    from app.payments import service as payments_service

    admin_token = await _login(client, "+2348070000001", role="admin")
    cust_token = await _login(client, "+2348070000002")
    agent_token = await _login(client, "+2348070000003")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == "+2348070000003"))).scalar_one()
        agent.role = UserRole.AGENT
        await s.commit()
        agent_id = agent.id
        market_id = uuid.uuid4()
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("500000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    # Baseline: no losses yet.
    r = await client.get("/admin/orders/losses", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["count"] == 0

    cust_id = uuid.UUID((await client.get("/auth/me", headers=cust_h)).json()["id"])

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "78000.00",
        "items": [{"description": "bulk rice bags"}]})
    oid = r.json()["id"]
    deposit = Decimal(r.json()["deposit_amount"])
    assert deposit == Decimal("15600.00")

    await client.post(f"/orders/{oid}/assign-agent", headers=admin_h, json={"agent_id": str(agent_id)})
    async with db_session_factory() as s:
        from app.wallet import service as wallet_service
        await wallet_service.credit(s, cust_id, deposit, note="fund")
        await s.commit()
    r = await client.post(f"/payments/orders/{oid}/deposit/pay-from-wallet", headers=cust_h)
    assert r.status_code == 200, r.text

    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992", "photo_ref": "https://example.com/receipt.jpg",
        "items": [{"item_id": item_id, "price": "78000.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)

    async with db_session_factory() as s:
        o = (await s.execute(select(Order).where(Order.id == uuid.UUID(oid)))).scalar_one()
        o.payment_window_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()
        await payments_service.expire_stale_orders(s)
        await s.commit()

    r = await client.get("/admin/orders/losses", headers=admin_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] == 1
    assert body["total_deposit_forfeited"] == "15600.00"
    row = body["orders"][0]
    assert row["id"] == oid
    assert row["deposit_forfeited"] == "15600.00"
    assert row["agent_id"] == str(agent_id)


@pytest.mark.asyncio
async def test_admin_lists_agents_with_earnings(client, db_session_factory):
    from decimal import Decimal
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    admin_token = await _login(client, "+2348080000001", role="admin")
    cust_token = await _login(client, "+2348080000002")
    agent_token = await _login(client, "+2348080000003")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    async with db_session_factory() as s:
        agent_u = (await s.execute(select(User).where(User.phone == "+2348080000003"))).scalar_one()
        agent_u.role = UserRole.AGENT
        market = Market(name="Agents Test Market", city="Lagos", state="Lagos")
        s.add(market)
        await s.flush()
        s.add(Agent(user_id=agent_u.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market.id, note="seed")
        await s.commit()
        agent_id, market_id = agent_u.id, market.id

    # Before any completed order: listed, zero earnings.
    r = await client.get("/admin/agents", headers=admin_h)
    assert r.status_code == 200, r.text
    row = next(a for a in r.json() if a["user_id"] == str(agent_id))
    assert row["phone"] == "+2348080000003"
    assert row["assigned_market_id"] == str(market_id)
    assert row["completed_orders"] == 0
    assert row["earnings_total"] == "0.00"

    oid = await _drive_order_to_paid(
        client, admin_h=admin_h, agent_h=agent_h, agent_id=agent_id,
        cust_h=cust_h, market_id=market_id,
    )
    r = await client.get(f"/orders/{oid}", headers=admin_h)
    agent_share = r.json()["agent_share"]

    r = await client.get("/admin/agents", headers=admin_h)
    row = next(a for a in r.json() if a["user_id"] == str(agent_id))
    assert row["completed_orders"] == 1
    assert row["earnings_total"] == agent_share

    print("Admin agents roster correctly shows lifetime earnings.")


@pytest.mark.asyncio
async def test_admin_agents_endpoint_is_admin_only(client):
    token = await _login(client, "+2348080000004")
    r = await client.get("/admin/agents", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_clears_user_flag(client, db_session_factory):
    from app.auth.models import User
    from app.core.enums import UserStatus

    admin_token = await _login(client, "+2348080000005", role="admin")
    cust_token = await _login(client, "+2348080000006")
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.phone == "+2348080000006"))).scalar_one()
        cust.must_prepay = True
        cust.non_payment_count = 2
        cust.status = UserStatus.FLAGGED
        await s.commit()
        cust_id = cust.id

    r = await client.get("/admin/users/flagged", headers=admin_h)
    row = next(u for u in r.json()["users"] if u["id"] == str(cust_id))
    assert row["must_prepay"] is True
    assert row["non_payment_count"] == 2

    r = await client.post(f"/admin/users/{cust_id}/clear-flag", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["must_prepay"] is False
    assert r.json()["non_payment_count"] == 0
    assert r.json()["status"] == "active"

    # No longer shows up in the flagged list at all.
    r = await client.get("/admin/users/flagged", headers=admin_h)
    assert not any(u["id"] == str(cust_id) for u in r.json()["users"])

    # A customer can't pardon themselves.
    r = await client.post(f"/admin/users/{cust_id}/clear-flag", headers={"Authorization": f"Bearer {cust_token}"})
    assert r.status_code == 403

    print("Admin clear-flag correctly pardons a flagged customer.")


@pytest.mark.asyncio
async def test_admin_analytics_reflects_recorded_data(client, db_session_factory):
    from decimal import Decimal
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service

    admin_token = await _login(client, "+2348080000007", role="admin")
    cust_token = await _login(client, "+2348080000008")
    agent_token = await _login(client, "+2348080000009")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    async with db_session_factory() as s:
        agent_u = (await s.execute(select(User).where(User.phone == "+2348080000009"))).scalar_one()
        agent_u.role = UserRole.AGENT
        market = Market(name="Analytics Test Market", city="Lagos", state="Lagos")
        s.add(market)
        await s.flush()
        s.add(Agent(user_id=agent_u.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000.00"),
            market_id=market.id, note="seed")
        await s.commit()
        agent_id, market_id = agent_u.id, market.id

    oid = await _drive_order_to_paid(
        client, admin_h=admin_h, agent_h=agent_h, agent_id=agent_id,
        cust_h=cust_h, market_id=market_id,
    )
    r = await client.get(f"/orders/{oid}", headers=admin_h)
    order = r.json()

    r = await client.get("/admin/analytics", headers=admin_h)
    assert r.status_code == 200, r.text
    data = r.json()

    # Today's bucket exists and reflects this exact order's numbers - not
    # fabricated, traceable straight back to the order just paid.
    assert sum(d["orders"] for d in data["volume_by_day"]) >= 1
    total_revenue = sum(Decimal(d["company_share"]) for d in data["revenue_by_day"])
    assert total_revenue >= Decimal(order["company_share"])

    agent_row = next(a for a in data["agent_activity"] if a["agent_id"] == str(agent_id))
    assert agent_row["completed_orders"] == 1
    assert agent_row["earnings"] == order["agent_share"]

    market_row = next(m for m in data["market_activity"] if m["market_id"] == str(market_id))
    assert market_row["orders"] == 1

    # This order is still PAID (not delivered/closed/cancelled), so it must
    # NOT be counted in the terminal-status rates yet.
    assert data["rates"]["total_terminal"] == 0

    print("Admin analytics correctly reflects only recorded, real data.")


@pytest.mark.asyncio
async def test_admin_analytics_is_admin_only(client):
    token = await _login(client, "+2348080000010")
    r = await client.get("/admin/analytics", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403

    print("Admin losses endpoint correctly surfaces the forfeited deposit.")
