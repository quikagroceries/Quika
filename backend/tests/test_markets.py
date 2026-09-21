from decimal import Decimal

import pytest

from app.auth.models import User
from app.core.enums import UserRole, UserStatus
from app.core.security import hash_password

CUSTOMER_PHONE = "+2348090000002"
_ADMIN_PASSWORD = "test-admin-password"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    body = {"identifier": phone, "code": code}
    if role:
        body["role"] = role
    r = await client.post("/auth/verify-otp", json=body)
    return r.json()["access_token"]


async def _login_admin(client, db_session_factory, email):
    """Admins sign in with email+password only, never phone/OTP - seed the
    account directly, the same way bootstrap_admin would in a real deploy."""
    async with db_session_factory() as s:
        s.add(
            User(
                email=email,
                password_hash=hash_password(_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
            )
        )
        await s.commit()
    r = await client.post("/admin/login", json={"email": email, "password": _ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_creates_market_and_customer_can_list_it(client, db_session_factory):
    admin_token = await _login_admin(client, db_session_factory, "admin_m1@qyka.com")
    customer_token = await _login(client, CUSTOMER_PHONE)

    r = await client.post(
        "/markets",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Mile 12 Market", "city": "Lagos", "state": "Lagos"},
    )
    assert r.status_code == 201, r.text
    market = r.json()
    assert market["is_active"] is True

    r = await client.get(
        "/markets", headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert r.status_code == 200, r.text
    assert any(m["id"] == market["id"] for m in r.json())

    # Guest browse — active markets are public
    r = await client.get("/markets")
    assert r.status_code == 200, r.text
    assert any(m["id"] == market["id"] for m in r.json())

    # Inactive listing still requires admin
    r = await client.get("/markets?active_only=false")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_updates_market(client, db_session_factory):
    admin_token = await _login_admin(client, db_session_factory, "admin_m2@qyka.com")
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    r = await client.post("/markets", headers=admin_h, json={
        "name": "Original Market", "city": "Lagos", "state": "Lagos",
        "latitude": 6.5244, "longitude": 3.3792,
    })
    assert r.status_code == 201, r.text
    mid = r.json()["id"]
    assert r.json()["latitude"] == 6.5244

    # Partial patch - only name and is_active - must not disturb city/state/coords.
    r = await client.patch(f"/markets/{mid}", headers=admin_h, json={
        "name": "Renamed Market", "is_active": False,
    })
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["name"] == "Renamed Market"
    assert updated["is_active"] is False
    assert updated["city"] == "Lagos"
    assert updated["latitude"] == 6.5244

    # Inactive markets drop out of the default (active_only) listing but are
    # still there when asked for explicitly.
    r = await client.get("/markets", headers=admin_h)
    assert not any(m["id"] == mid for m in r.json())
    r = await client.get("/markets?active_only=false", headers=admin_h)
    assert any(m["id"] == mid and m["name"] == "Renamed Market" for m in r.json())


@pytest.mark.asyncio
async def test_customer_cannot_update_market(client, db_session_factory):
    admin_token = await _login_admin(client, db_session_factory, "admin_m3@qyka.com")
    customer_token = await _login(client, "+2348090000004")
    r = await client.post(
        "/markets", headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "M", "city": "Lagos", "state": "Lagos"},
    )
    mid = r.json()["id"]

    r = await client.patch(
        f"/markets/{mid}", headers={"Authorization": f"Bearer {customer_token}"},
        json={"name": "Hijacked"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_customer_cannot_create_market(client):
    customer_token = await _login(client, "+2348090000003")

    r = await client.post(
        "/markets",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"name": "Rogue Market", "city": "Lagos", "state": "Lagos"},
    )
    assert r.status_code == 403


async def _make_agent(client, db_session_factory, phone, market_id):
    """Log in as an agent and give them an Agent record for a market -
    mirrors what admin.service.promote_to_agent does, without going through
    the full application/approval flow (irrelevant to these tests)."""
    import uuid as _uuid
    from app.auth.models import User
    from app.markets.models import Agent
    from sqlalchemy import select

    token = await _login(client, phone, role="agent")
    async with db_session_factory() as s:
        user = (await s.execute(select(User).where(User.phone == phone))).scalar_one()
        s.add(Agent(user_id=user.id, assigned_market_id=market_id, is_available=True))
        await s.commit()
        agent_id = user.id
    return token, agent_id


@pytest.mark.asyncio
async def test_agent_duty_toggle_defaults_true_and_persists(client, db_session_factory):
    import uuid
    market_id = uuid.uuid4()
    token, _agent_id = await _make_agent(client, db_session_factory, "+2348090000010", market_id)
    h = {"Authorization": f"Bearer {token}"}

    r = await client.get("/markets/agents/me", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["on_duty"] is True  # defaults to the agent view

    r = await client.patch("/markets/agents/me/duty", headers=h, json={"on_duty": False})
    assert r.status_code == 200, r.text
    assert r.json()["on_duty"] is False

    r = await client.get("/markets/agents/me", headers=h)
    assert r.json()["on_duty"] is False  # persisted, not just echoed back

    r = await client.patch("/markets/agents/me/duty", headers=h, json={"on_duty": True})
    assert r.status_code == 200
    assert r.json()["on_duty"] is True


@pytest.mark.asyncio
async def test_agent_cannot_go_off_duty_with_a_live_order(client, db_session_factory):
    import uuid
    from app.core.enums import LedgerDirection
    from app.float import service as float_service

    market_id = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("50000.00"),
            market_id=market_id, note="seed")
        await s.commit()

    agent_token, agent_id = await _make_agent(client, db_session_factory, "+2348090000011", market_id)
    cust_token = await _login(client, "+2348090000012")
    cust_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    oid = r.json()["id"]
    assert r.json()["proposed_agent_id"] == str(agent_id)  # proposed - the only agent for this market
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    assert r.json()["agent_id"] == str(agent_id)

    # Assigned but not yet shopping - still refused.
    r = await client.patch("/markets/agents/me/duty", headers=agent_h, json={"on_duty": False})
    assert r.status_code == 409, r.text

    r2 = await client.get("/markets/agents/me", headers=agent_h)
    assert r2.json()["on_duty"] is True  # unchanged by the refused attempt


@pytest.mark.asyncio
async def test_off_duty_agent_never_auto_assigned_their_own_order(client, db_session_factory):
    """The one edge the whole feature hinges on: an agent who is the ONLY
    agent covering a market, switched to customer mode, must never be handed
    an order they place for themselves at that market. Proven both ways: it
    fails to assign while off duty, and succeeds once back on duty - so the
    absence of assignment is really the on_duty guard, not some unrelated
    setup bug.
    """
    import uuid
    market_id = uuid.uuid4()
    agent_token, agent_id = await _make_agent(client, db_session_factory, "+2348090000013", market_id)
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    # Switch to customer mode.
    r = await client.patch("/markets/agents/me/duty", headers=agent_h, json={"on_duty": False})
    assert r.status_code == 200, r.text
    assert r.json()["on_duty"] is False

    # Same person, now shopping for themselves, at the market they'd
    # otherwise auto-assign to.
    r = await client.post("/orders", headers=agent_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}],
    })
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["agent_id"] is None, "off-duty agent must never be proposed, even for their own order"
    assert order["proposed_agent_id"] is None
    assert order["status"] == "draft"

    # Switch back on duty - the mechanism itself still works normally.
    r = await client.patch("/markets/agents/me/duty", headers=agent_h, json={"on_duty": True})
    assert r.status_code == 200, r.text

    r = await client.post("/orders", headers=agent_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "rice"}],
    })
    assert r.status_code == 201, r.text
    order2 = r.json()
    assert order2["proposed_agent_id"] == str(agent_id)
    assert order2["status"] == "proposed"
