import pytest

from app.markets.models import Market
from tests.test_admin import _login, _login_admin


async def _market(db_session_factory, name="Bodija"):
    async with db_session_factory() as s:
        market = Market(name=name, city="Ibadan", state="Oyo")
        s.add(market)
        await s.commit()
        await s.refresh(market)
        return market.id


@pytest.mark.asyncio
async def test_public_agent_application_approved_becomes_agent_on_first_sign_in(client, db_session_factory):
    market_id = await _market(db_session_factory)
    admin_h = {"Authorization": f"Bearer {await _login_admin(client, db_session_factory, 'apps1@qyka.com')}"}

    # No account, no token - straight from the For Agents page.
    r = await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "Ada Obi", "phone": "0803 111 2222", "market_id": str(market_id),
    })
    assert r.status_code == 201, r.text
    assert "id" not in r.json()

    # Same number, same kind, still pending -> refused.
    r = await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "Ada Obi", "phone": "+2348031112222", "market_id": str(market_id),
    })
    assert r.status_code == 409

    r = await client.get("/agent-applications?status=pending&kind=agent", headers=admin_h)
    [app] = r.json()
    assert (app["full_name"], app["phone"], app["user_id"]) == ("Ada Obi", "+2348031112222", None)
    r = await client.get("/agent-applications?status=pending&kind=rider", headers=admin_h)
    assert r.json() == []

    r = await client.post(f"/agent-applications/{app['id']}/approve", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["user_id"] is not None

    token = await _login(client, "08031112222")
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.json()["role"] == "agent"
    assert r.json()["full_name"] == "Ada Obi"


@pytest.mark.asyncio
async def test_public_agent_application_validation(client, db_session_factory):
    market_id = await _market(db_session_factory)
    r = await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "No Market", "phone": "08030000001",
    })
    assert r.status_code == 422
    r = await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "Bad Phone", "phone": "call me", "market_id": str(market_id),
    })
    assert r.status_code == 422
    r = await client.post("/agent-applications/public", json={
        "kind": "rider", "full_name": "Nowhere", "phone": "08030000002",
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_rider_application_approved_joins_roster_and_can_be_suspended(client, db_session_factory):
    admin_h = {"Authorization": f"Bearer {await _login_admin(client, db_session_factory, 'apps2@qyka.com')}"}

    r = await client.post("/agent-applications/public", json={
        "kind": "rider", "full_name": "Tunde Bello", "phone": "08094445555",
        "area": "Ikeja, Lagos", "vehicle": "Bike",
    })
    assert r.status_code == 201, r.text

    [app] = (await client.get("/agent-applications?status=pending&kind=rider", headers=admin_h)).json()
    assert (app["area"], app["vehicle"]) == ("Ikeja, Lagos", "Bike")
    r = await client.post(f"/agent-applications/{app['id']}/approve", headers=admin_h)
    assert r.status_code == 200, r.text

    [rider] = (await client.get("/admin/riders", headers=admin_h)).json()
    assert (rider["full_name"], rider["phone"], rider["status"]) == ("Tunde Bello", "+2348094445555", "active")

    # Already on the roster -> a fresh application is refused.
    r = await client.post("/agent-applications/public", json={
        "kind": "rider", "full_name": "Tunde Bello", "phone": "08094445555", "area": "Ikeja",
    })
    assert r.status_code == 409

    r = await client.patch(f"/admin/riders/{rider['id']}", headers=admin_h, json={"status": "suspended"})
    assert r.status_code == 200
    assert r.json()["status"] == "suspended"

    # Riders aren't a login role: signing in with that number is just a customer.
    token = await _login(client, "08094445555")
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.json()["role"] == "customer"


@pytest.mark.asyncio
async def test_rider_roster_is_admin_only(client):
    token = await _login(client, "08097776666")
    r = await client.get("/admin/riders", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_website_agent_is_agent_only_until_registering_as_customer(client, db_session_factory):
    market_id = await _market(db_session_factory, "Oja Oba")
    admin_h = {"Authorization": f"Bearer {await _login_admin(client, db_session_factory, 'apps3@qyka.com')}"}
    r = await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "Kemi Ade", "phone": "08035556666", "market_id": str(market_id),
    })
    [app] = (await client.get("/agent-applications?status=pending&kind=agent", headers=admin_h)).json()
    await client.post(f"/agent-applications/{app['id']}/approve", headers=admin_h)

    h = {"Authorization": f"Bearer {await _login(client, '08035556666')}"}
    me = (await client.get("/auth/me", headers=h)).json()
    assert (me["role"], me["has_customer_side"]) == ("agent", False)

    # No shopping side: can't switch to customer mode, place an order or fund a wallet.
    r = await client.patch("/markets/agents/me/duty", headers=h, json={"on_duty": False})
    assert r.status_code == 403
    r = await client.post("/orders", headers=h, json={
        "market_id": str(market_id), "listed_items_total": "1000.00", "items": [{"description": "rice"}],
    })
    assert r.status_code == 403
    r = await client.post("/wallet/fund", headers=h, json={"amount": "1000.00"})
    assert r.status_code == 403

    r = await client.post("/auth/me/register-customer", headers=h, json={"default_delivery_address": "3 Ring Road, Ibadan"})
    assert r.status_code == 200, r.text
    assert r.json()["has_customer_side"] is True
    assert r.json()["default_delivery_address"] == "3 Ring Road, Ibadan"
    r = await client.post("/auth/me/register-customer", headers=h, json={})
    assert r.status_code == 409

    r = await client.patch("/markets/agents/me/duty", headers=h, json={"on_duty": False})
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_existing_customer_approved_from_website_keeps_customer_side(client, db_session_factory):
    market_id = await _market(db_session_factory, "Dugbe")
    admin_h = {"Authorization": f"Bearer {await _login_admin(client, db_session_factory, 'apps4@qyka.com')}"}
    h = {"Authorization": f"Bearer {await _login(client, '08037778888')}"}  # registers as a customer
    await client.post("/agent-applications/public", json={
        "kind": "agent", "full_name": "Sola", "phone": "08037778888", "market_id": str(market_id),
    })
    [app] = (await client.get("/agent-applications?status=pending&kind=agent", headers=admin_h)).json()
    await client.post(f"/agent-applications/{app['id']}/approve", headers=admin_h)

    me = (await client.get("/auth/me", headers=h)).json()
    assert (me["role"], me["has_customer_side"]) == ("agent", True)
