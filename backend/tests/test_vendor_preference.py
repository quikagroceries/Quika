"""Item-level vendor preference + agent-driven stall registration.

Stalls (jit.models.Seller) are created as a byproduct of an agent actually
finding one while shopping - there is no admin authorship path. A customer's
preferred_stall_id on an order item is a hint the agent tries to honor, not a
binding order: when the pinned stall can't fulfil it, that routes through the
exact same unavailable-item flow as any other missing item (see
test_item_overage.py / test_nonpayment_and_flows.py for that flow's own
coverage - this file only checks the wording differs when a stall was pinned).
"""

from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348040000001"
PHONE_AGENT = "+2348040000002"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    body = {"phone": phone, "code": code}
    if role:
        body["role"] = role
    r = await client.post("/auth/verify-otp", json=body)
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
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("200000"), market_id=market.id, note="seed")
        await s.commit()
        return (
            {"Authorization": f"Bearer {cust_token}"},
            {"Authorization": f"Bearer {agent_token}"},
            agent.id, market.id,
        )


@pytest.mark.asyncio
async def test_agent_creates_stall_and_it_shows_up_immediately(client, db_session_factory):
    _cust_h, agent_h, _agent_id, market_id = await _setup(client, db_session_factory)

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=agent_h,
        json={"name": "Mama Chidinma", "stall_description": "Fresh peppers, row 3"},
    )
    assert r.status_code == 201, r.text
    vendor = r.json()
    assert vendor["name"] == "Mama Chidinma"
    assert vendor["market_id"] == str(market_id)

    # Live immediately - no approval step - via the SAME read path customers use.
    r = await client.get(f"/markets/{market_id}/vendors")
    assert r.status_code == 200, r.text
    assert any(v["id"] == vendor["id"] for v in r.json())


@pytest.mark.asyncio
async def test_agent_stall_geotag_is_optional_and_captured_when_sent(client, db_session_factory):
    """A single point captured from the agent's device at save time - never
    required, never blocks creation either way."""
    _cust_h, agent_h, _agent_id, market_id = await _setup(client, db_session_factory)

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=agent_h,
        json={"name": "No GPS Stall"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["latitude"] is None
    assert r.json()["longitude"] is None

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=agent_h,
        json={"name": "Geotagged Stall", "latitude": 6.4550, "longitude": 3.3841},
    )
    assert r.status_code == 201, r.text
    assert r.json()["latitude"] == 6.4550
    assert r.json()["longitude"] == 3.3841


@pytest.mark.asyncio
async def test_customer_cannot_create_a_stall(client, db_session_factory):
    cust_h, _agent_h, _agent_id, market_id = await _setup(client, db_session_factory)

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=cust_h,
        json={"name": "Rogue Stall"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_create_a_stall(client, db_session_factory):
    """Authorship is agent-only - admin gets read/merge, not creation."""
    _cust_h, _agent_h, _agent_id, market_id = await _setup(client, db_session_factory)
    admin_token = await _login(client, "+2348040000099", role="admin")
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=admin_h,
        json={"name": "Admin-curated Stall"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stall_creation_requires_a_real_market(client, db_session_factory):
    _cust_h, agent_h, _agent_id, _market_id = await _setup(client, db_session_factory)
    import uuid
    r = await client.post(
        f"/markets/{uuid.uuid4()}/vendors", headers=agent_h,
        json={"name": "Ghost Stall"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_order_item_carries_preferred_stall_id(client, db_session_factory):
    cust_h, agent_h, _agent_id, market_id = await _setup(client, db_session_factory)

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=agent_h,
        json={"name": "Mama Chidinma", "stall_description": "Peppers"},
    )
    stall_id = r.json()["id"]

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id),
        "listed_items_total": "0.00",
        "items": [
            {"description": "pepper", "listed_price": "1000.00", "preferred_stall_id": stall_id},
            {"description": "rice", "listed_price": "2000.00"},
        ],
    })
    assert r.status_code == 201, r.text
    items = {it["description"]: it for it in r.json()["items"]}
    assert items["pepper"]["preferred_stall_id"] == stall_id
    assert items["rice"]["preferred_stall_id"] is None


@pytest.mark.asyncio
async def test_pinned_vendor_unavailable_reuses_the_same_exception_flow(client, db_session_factory):
    """No separate 'vendor unavailable' mechanism - it's the exact same
    flag/decide pair as any other missing item, just with different wording
    in the customer notification."""
    cust_h, agent_h, _agent_id, market_id = await _setup(client, db_session_factory)

    r = await client.post(
        f"/markets/{market_id}/vendors", headers=agent_h,
        json={"name": "Mama Chidinma"},
    )
    stall_id = r.json()["id"]

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "0.00",
        "items": [
            {"description": "pepper", "listed_price": "1000.00", "preferred_stall_id": stall_id},
            {"description": "rice", "listed_price": "2000.00"},
        ],
    })
    oid = r.json()["id"]
    items = {it["description"]: it["id"] for it in r.json()["items"]}
    await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)

    # Pinned item: flag unavailable through the ordinary endpoint.
    r = await client.post(f"/orders/{oid}/items/{items['pepper']}/unavailable", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "unavailable"

    # Unpinned item: same endpoint, no special-casing needed.
    r = await client.post(f"/orders/{oid}/items/{items['rice']}/unavailable", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "unavailable"

    r = await client.get("/notifications", headers=cust_h)
    messages = {n["message"] for n in r.json() if n["kind"] == "item_unavailable"}
    assert any("preferred stall" in m for m in messages), messages
    assert any("isn't available here" in m for m in messages), messages

    # Customer decides through the SAME decide endpoint either way.
    r = await client.post(f"/orders/{oid}/items/{items['pepper']}/decide",
                           headers=cust_h, json={"decision": "buy_elsewhere"})
    assert r.status_code == 200, r.text
    assert r.json()["availability"] == "buy_elsewhere"
