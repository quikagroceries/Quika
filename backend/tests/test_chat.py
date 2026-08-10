"""Chat: customer and assigned agent can post/read; anyone else gets 403."""

import uuid

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
    """Customer + agent, agent assigned to a fresh order via the admin route."""
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

    r = await client.post(
        "/orders",
        headers=admin_headers,
        json={"market_id": str(market_id), "items": [{"description": "pepper"}]},
    )
    assert r.status_code == 201, r.text
    order_id = r.json()["id"]

    r = await client.post(
        f"/orders/{order_id}/assign-agent",
        headers=admin_headers,
        json={"agent_id": str(agent_user_id)},
    )
    assert r.status_code == 200, r.text

    return order_id, admin_headers, agent_headers


@pytest.mark.asyncio
async def test_customer_and_agent_can_post_and_read_messages(client, db_session_factory):
    order_id, cust_headers, agent_headers = await _setup_order(client, db_session_factory)

    r = await client.post(
        f"/orders/{order_id}/messages", headers=cust_headers,
        json={"text": "Hi, is the market busy today?"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["text"] == "Hi, is the market busy today?"

    r = await client.post(
        f"/orders/{order_id}/messages", headers=agent_headers,
        json={"text": "Not too bad, heading in now."},
    )
    assert r.status_code == 201, r.text

    r = await client.post(
        f"/orders/{order_id}/messages", headers=agent_headers,
        json={"image_url": "https://res.cloudinary.com/y0vuqbu5/image/upload/v1/pepper.jpg"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["image_url"].endswith("pepper.jpg")

    # Both participants see the full thread, oldest first.
    r = await client.get(f"/orders/{order_id}/messages", headers=cust_headers)
    assert r.status_code == 200, r.text
    texts = [m["text"] for m in r.json()]
    assert texts == [
        "Hi, is the market busy today?", "Not too bad, heading in now.", None,
    ]

    r = await client.get(f"/orders/{order_id}/messages", headers=agent_headers)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 3


@pytest.mark.asyncio
async def test_non_participant_forbidden(client, db_session_factory):
    order_id, cust_headers, _agent_headers = await _setup_order(client, db_session_factory)
    outsider_token = await _login(client, PHONE_OUTSIDER)
    outsider_headers = {"Authorization": f"Bearer {outsider_token}"}

    r = await client.post(
        f"/orders/{order_id}/messages", headers=outsider_headers, json={"text": "hi"},
    )
    assert r.status_code == 403, r.text

    r = await client.get(f"/orders/{order_id}/messages", headers=outsider_headers)
    assert r.status_code == 403, r.text

    # Sanity: the actual participant still isn't blocked by the above.
    r = await client.get(f"/orders/{order_id}/messages", headers=cust_headers)
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_message_requires_text_or_image(client, db_session_factory):
    order_id, cust_headers, _agent_headers = await _setup_order(client, db_session_factory)
    r = await client.post(
        f"/orders/{order_id}/messages", headers=cust_headers, json={},
    )
    assert r.status_code == 422, r.text
