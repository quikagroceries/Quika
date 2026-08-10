"""Agent rating (#7): customer feedback only, tied to a completed order,
once. Must never feed assignment or agent pay - see the docstring on
ratings.service for the design intent this proves.
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

PHONE_CUST = "+2348040000001"
PHONE_AGENT = "+2348040000002"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "code": code})
    return r.json()["access_token"]


async def _completed_order(client, db_session_factory, monkeypatch):
    """Drive an order all the way to DELIVERED, mirroring the money-model
    happy path used elsewhere (test_money_model.py)."""
    from app.auth.models import User
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market
    from app.payments import transfers

    async def fake_send(*, account_number, bank_code, amount_naira, reference, reason="x"):
        return {"reference": reference, "status": "success", "fee": 0}
    monkeypatch.setattr(transfers, "send_transfer", fake_send)

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
        agent_id = agent.id
        market_id = market.id

    cust_h = {"Authorization": f"Bearer {cust_token}"}
    agent_h = {"Authorization": f"Bearer {agent_token}"}

    from app.wallet import service as wallet_service
    async with db_session_factory() as s:
        cust = (await s.execute(select(User).where(User.phone == PHONE_CUST))).scalar_one()
        await wallet_service.credit(s, cust.id, Decimal("50000"), note="fund")
        await s.commit()

    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    r = await client.post(f"/orders/{oid}/accept-agent", headers=cust_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/orders/{oid}/start-shopping", headers=agent_h)
    item_id = r.json()["items"][0]["id"]
    await client.post(f"/jit/orders/{oid}/pay-vendor", headers=agent_h, json={
        "account_number": "9012345678", "bank_code": "999992",
        "items": [{"item_id": item_id, "price": "1500.00"}]})
    await client.post(f"/orders/{oid}/finish-shopping", headers=agent_h)
    r = await client.post(f"/payments/orders/{oid}/pay-from-wallet", headers=cust_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/delivery/orders/{oid}/pack", headers=agent_h)
    assert r.status_code == 200, r.text
    r = await client.post(f"/delivery/orders/{oid}/dispatch-courier", headers=agent_h, json={})
    assert r.status_code == 200, r.text
    r = await client.post(f"/delivery/orders/{oid}/confirm-delivery", headers=cust_h)
    assert r.status_code == 200, r.text

    r = await client.get(f"/orders/{oid}", headers=cust_h)
    assert r.json()["status"] in ("delivered", "closed"), r.json()["status"]

    return oid, cust_h, agent_h, agent_id


@pytest.mark.asyncio
async def test_customer_can_rate_a_completed_order(client, db_session_factory, monkeypatch):
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)

    r = await client.post(f"/orders/{oid}/rating", headers=cust_h,
                           json={"stars": 5, "comment": "Great shopper!"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["stars"] == 5
    assert body["comment"] == "Great shopper!"
    assert body["agent_id"] == str(agent_id)

    r = await client.get(f"/orders/{oid}/rating", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["stars"] == 5


@pytest.mark.asyncio
async def test_cannot_rate_twice(client, db_session_factory, monkeypatch):
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)
    r = await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 4})
    assert r.status_code == 200, r.text

    r = await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 2})
    assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_cannot_rate_before_completion(client, db_session_factory):
    from app.core.enums import LedgerDirection, UserRole
    from app.float import service as float_service
    from app.markets.models import Agent, Market
    from app.auth.models import User

    cust_token = await _login(client, "+2348040000010")
    agent_token = await _login(client, "+2348040000011")
    async with db_session_factory() as s:
        agent = (await s.execute(select(User).where(User.phone == "+2348040000011"))).scalar_one()
        agent.role = UserRole.AGENT
        market = Market(name="M", city="PH", state="Rivers")
        s.add(market); await s.flush()
        s.add(Agent(user_id=agent.id, assigned_market_id=market.id, is_available=True))
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("100000"), market_id=market.id, note="seed")
        await s.commit()
        market_id = market.id

    cust_h = {"Authorization": f"Bearer {cust_token}"}
    r = await client.post("/orders", headers=cust_h, json={
        "market_id": str(market_id), "listed_items_total": "2000.00",
        "items": [{"description": "pepper"}]})
    oid = r.json()["id"]
    assert r.json()["status"] == "proposed"

    r = await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 3})
    assert r.status_code == 409, r.text


@pytest.mark.asyncio
async def test_only_the_orders_own_customer_can_rate(client, db_session_factory, monkeypatch):
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)
    stranger_token = await _login(client, "+2348040000099")
    stranger_h = {"Authorization": f"Bearer {stranger_token}"}

    r = await client.post(f"/orders/{oid}/rating", headers=stranger_h, json={"stars": 5})
    assert r.status_code == 403

    # The agent themselves cannot self-rate either.
    r = await client.post(f"/orders/{oid}/rating", headers=agent_h, json={"stars": 5})
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stars_out_of_range_rejected(client, db_session_factory, monkeypatch):
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)
    r = await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 6})
    assert r.status_code == 422
    r = await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_no_rating_yet_returns_null(client, db_session_factory, monkeypatch):
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)
    r = await client.get(f"/orders/{oid}/rating", headers=cust_h)
    assert r.status_code == 200, r.text
    assert r.json() is None


@pytest.mark.asyncio
async def test_rating_does_not_affect_assignment_pool(client, db_session_factory, monkeypatch):
    """A rating is feedback only - the agent stays available for new
    assignments regardless of stars given."""
    oid, cust_h, agent_h, agent_id = await _completed_order(client, db_session_factory, monkeypatch)
    await client.post(f"/orders/{oid}/rating", headers=cust_h, json={"stars": 1, "comment": "slow"})

    r = await client.get("/markets/agents/me", headers=agent_h)
    assert r.status_code == 200, r.text
    assert r.json()["on_duty"] is True
