"""Per-market float pools: isolation, overdraw guard, cross-market transfer."""

import uuid
from decimal import Decimal

import pytest

from app.core.enums import LedgerDirection

ADMIN_PHONE = "+2348090000001"
CUST_PHONE = "+2348090000002"


async def _login(client, phone, role=None):
    r = await client.post("/auth/request-otp", json={"identifier": phone})
    code = r.json()["dev_otp"]
    body = {"identifier": phone, "code": code}
    if role:
        body["role"] = role
    r = await client.post("/auth/verify-otp", json=body)
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_pools_are_isolated_per_market(client, db_session_factory):
    """Money in one market's pool is invisible to another market."""
    from app.float import service as float_service
    m1, m2 = uuid.uuid4(), uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("50000"), market_id=m1)
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("20000"), market_id=m2)
        await s.commit()
    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m1) == Decimal("50000.00")
        assert await float_service.get_pool_balance(s, m2) == Decimal("20000.00")
        # global pool untouched
        assert await float_service.get_pool_balance(s, None) == Decimal("0.00")


@pytest.mark.asyncio
async def test_pool_cannot_be_overdrawn(client, db_session_factory):
    """A debit larger than a market's balance is refused."""
    from app.float import service as float_service
    m = uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("5000"), market_id=m)
        await s.commit()
    async with db_session_factory() as s:
        with pytest.raises(ValueError):
            await float_service.record_movement(
                s, direction=LedgerDirection.DEBIT, amount=Decimal("8000"), market_id=m)


@pytest.mark.asyncio
async def test_transfer_between_pools(client, db_session_factory):
    """Admin can move float from a quiet market to a busy one."""
    from app.float import service as float_service
    m_quiet, m_busy = uuid.uuid4(), uuid.uuid4()
    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("40000"), market_id=m_quiet)
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("5000"), market_id=m_busy)
        await s.commit()
    async with db_session_factory() as s:
        await float_service.transfer_between_pools(
            s, from_market=m_quiet, to_market=m_busy, amount=Decimal("15000"))
        await s.commit()
    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m_quiet) == Decimal("25000.00")
        assert await float_service.get_pool_balance(s, m_busy) == Decimal("20000.00")


# ---------- POST /float/transfer (route layer over the tested service fn) ----------

@pytest.mark.asyncio
async def test_transfer_route_moves_money_exactly_once(client, db_session_factory):
    from app.float import service as float_service
    admin_token = await _login(client, ADMIN_PHONE, role="admin")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    m_quiet, m_busy = uuid.uuid4(), uuid.uuid4()

    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("40000"), market_id=m_quiet)
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("5000"), market_id=m_busy)
        await s.commit()

    r = await client.post("/float/transfer", headers=admin_h, json={
        "from_market_id": str(m_quiet), "to_market_id": str(m_busy),
        "amount": "15000.00", "note": "busy market running dry",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["from_balance"] == "25000.00"
    assert body["to_balance"] == "20000.00"

    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m_quiet) == Decimal("25000.00")
        assert await float_service.get_pool_balance(s, m_busy) == Decimal("20000.00")

    # Repeating the SAME request is a second, independent transfer (not a
    # no-op / idempotent retry) - confirms the route doesn't double-apply a
    # single call, while also documenting that a caller must not blindly
    # retry a succeeded transfer expecting it to be free.
    r = await client.post("/float/transfer", headers=admin_h, json={
        "from_market_id": str(m_quiet), "to_market_id": str(m_busy),
        "amount": "15000.00",
    })
    assert r.status_code == 200, r.text
    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m_quiet) == Decimal("10000.00")
        assert await float_service.get_pool_balance(s, m_busy) == Decimal("35000.00")

    print("Float transfer route moves money exactly once per call, no drift.")


@pytest.mark.asyncio
async def test_transfer_route_rejects_overdraw(client, db_session_factory):
    from app.float import service as float_service
    admin_token = await _login(client, ADMIN_PHONE, role="admin")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    m_from, m_to = uuid.uuid4(), uuid.uuid4()

    async with db_session_factory() as s:
        await float_service.record_movement(
            s, direction=LedgerDirection.CREDIT, amount=Decimal("5000"), market_id=m_from)
        await s.commit()

    r = await client.post("/float/transfer", headers=admin_h, json={
        "from_market_id": str(m_from), "to_market_id": str(m_to), "amount": "8000.00",
    })
    assert r.status_code == 402, r.text

    # Neither pool moved - a rejected transfer must be a complete no-op.
    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m_from) == Decimal("5000.00")
        assert await float_service.get_pool_balance(s, m_to) == Decimal("0.00")

    print("Float transfer route correctly refuses to overdraw the source pool.")


@pytest.mark.asyncio
async def test_transfer_route_is_admin_only(client):
    cust_token = await _login(client, CUST_PHONE)
    cust_h = {"Authorization": f"Bearer {cust_token}"}

    r = await client.post("/float/transfer", headers=cust_h, json={
        "from_market_id": str(uuid.uuid4()), "to_market_id": str(uuid.uuid4()),
        "amount": "1000.00",
    })
    assert r.status_code == 403

    print("Float transfer route correctly refuses a non-admin caller.")


# ---------- market-scoped top-up / balance (route layer) ----------

@pytest.mark.asyncio
async def test_top_up_route_credits_specific_market_pool(client, db_session_factory):
    from app.float import service as float_service
    admin_token = await _login(client, ADMIN_PHONE, role="admin")
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    m = uuid.uuid4()

    # Omitting market_id still hits the legacy/global pool, unchanged.
    r = await client.post("/float/top-up", headers=admin_h, json={"amount": "1000.00"})
    assert r.status_code == 200, r.text
    assert r.json()["balance"] == "1000.00"

    r = await client.post(
        f"/float/top-up?market_id={m}", headers=admin_h, json={"amount": "25000.00"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["balance"] == "25000.00"

    r = await client.get(f"/float/balance?market_id={m}", headers=admin_h)
    assert r.status_code == 200, r.text
    assert r.json()["balance"] == "25000.00"

    # The global pool (from the first top-up) is untouched by the market one.
    r = await client.get("/float/balance", headers=admin_h)
    assert r.json()["balance"] == "1000.00"

    async with db_session_factory() as s:
        assert await float_service.get_pool_balance(s, m) == Decimal("25000.00")
        assert await float_service.get_pool_balance(s, None) == Decimal("1000.00")

    print("Market-scoped top-up/balance routes correctly isolate from the global pool.")
