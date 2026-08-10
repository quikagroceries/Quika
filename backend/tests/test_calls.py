"""LiveKit call tokens: participant-gated, room = order id."""

import uuid

import jwt as pyjwt
import pytest
from sqlalchemy import select

PHONE_CUST = "+2348010000001"
PHONE_AGENT = "+2348020000002"
PHONE_OUTSIDER = "+2348030000003"


async def _login(client, phone):
    r = await client.post("/auth/request-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post("/auth/verify-otp", json={"phone": phone, "code": code})
    return r.json()["access_token"]


async def _setup_order(client, db_session_factory):
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
        cust_user.role = UserRole.ADMIN
        await s.commit()
        agent_user_id = agent_user.id

    admin_headers = {"Authorization": f"Bearer {cust_token}"}
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    r = await client.post(
        "/orders", headers=admin_headers,
        json={"market_id": str(market_id), "items": [{"description": "pepper"}]},
    )
    order_id = r.json()["id"]
    r = await client.post(
        f"/orders/{order_id}/assign-agent", headers=admin_headers,
        json={"agent_id": str(agent_user_id)},
    )
    assert r.status_code == 200, r.text

    return order_id, admin_headers, agent_headers


@pytest.mark.asyncio
async def test_participant_gets_a_valid_token(client, db_session_factory, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "livekit_url", "wss://fake.livekit.cloud")
    monkeypatch.setattr(settings, "livekit_api_key", "fake_key")
    monkeypatch.setattr(settings, "livekit_api_secret", "fake_secret_long_enough_1234")

    order_id, cust_headers, agent_headers = await _setup_order(client, db_session_factory)

    r = await client.post(f"/calls/{order_id}/token", headers=cust_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["url"] == "wss://fake.livekit.cloud"
    assert data["room"] == order_id

    decoded = pyjwt.decode(
        data["token"], "fake_secret_long_enough_1234", algorithms=["HS256"]
    )
    assert decoded["video"]["room"] == order_id
    assert decoded["video"]["roomJoin"] is True
    assert decoded["iss"] == "fake_key"

    # The agent gets a token for the SAME room, so they land in one call.
    r = await client.post(f"/calls/{order_id}/token", headers=agent_headers)
    assert r.status_code == 200, r.text
    assert r.json()["room"] == order_id


@pytest.mark.asyncio
async def test_non_participant_forbidden(client, db_session_factory, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "livekit_url", "wss://fake.livekit.cloud")
    monkeypatch.setattr(settings, "livekit_api_key", "fake_key")
    monkeypatch.setattr(settings, "livekit_api_secret", "fake_secret_long_enough_1234")

    order_id, _cust_headers, _agent_headers = await _setup_order(client, db_session_factory)
    outsider_token = await _login(client, PHONE_OUTSIDER)
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    r = await client.post(f"/calls/{order_id}/token", headers=outsider_headers)
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_returns_503_when_livekit_not_configured(client, db_session_factory, monkeypatch):
    # Force the unconfigured state explicitly - don't rely on .env actually
    # lacking these (it now has real LiveKit Cloud credentials).
    from app.core.config import settings
    monkeypatch.setattr(settings, "livekit_url", "")
    monkeypatch.setattr(settings, "livekit_api_key", "")
    monkeypatch.setattr(settings, "livekit_api_secret", "")

    order_id, cust_headers, _agent_headers = await _setup_order(client, db_session_factory)
    r = await client.post(f"/calls/{order_id}/token", headers=cust_headers)
    assert r.status_code == 503, r.text
