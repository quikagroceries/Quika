"""Dev-only helpers. Disabled entirely when environment == 'production'.

The seed endpoint solves the testing hassle: one call returns ready-to-use
admin, agent, and customer tokens (verified, roles set, an agent record and a
market created) so you don't have to walk the OTP flow three times to test a
single order.
"""

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth.models import User
from app.core.config import settings
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.enums import LedgerDirection, UserRole, UserStatus
from app.core.phone import normalize_phone
from app.core.security import create_access_token
from app.float import service as float_service
from app.markets.models import Agent, Market

router = APIRouter()


def _guard() -> None:
    if settings.environment == "production":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")


async def _make_user(db, phone, role) -> User:
    phone = normalize_phone(phone)
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone, role=role, status=UserStatus.ACTIVE,
            is_phone_verified=True, basket_cap_kobo=settings.default_basket_cap_kobo,
        )
        db.add(user)
        await db.flush()
    else:
        user.role = role
    return user


@router.post("/seed")
async def seed(db: AsyncSession = Depends(get_db)):
    """Create admin + agent + customer + a market, seed the float, return tokens."""
    _guard()
    if True:
        admin = await _make_user(db, "+2340000000001", UserRole.ADMIN)
        agent_user = await _make_user(db, "+2340000000002", UserRole.AGENT)
        customer = await _make_user(db, "+2340000000003", UserRole.CUSTOMER)

        # a market
        result = await db.execute(select(Market).limit(1))
        market = result.scalar_one_or_none()
        if market is None:
            market = Market(
                name="Mile 1 Market", city="Port Harcourt", state="Rivers",
                latitude=4.8156, longitude=7.0498,
            )
            db.add(market)
            await db.flush()

        # an agent record tied to the agent user + market
        result = await db.execute(select(Agent).where(Agent.user_id == agent_user.id))
        agent = result.scalar_one_or_none()
        if agent is None:
            agent = Agent(
                user_id=agent_user.id, assigned_market_id=market.id, is_available=True
            )
            db.add(agent)
            await db.flush()

        # seed the float pool if empty
        balance = await float_service.get_pool_balance(db, market.id)
        if balance == 0:
            await float_service.record_movement(
                db, direction=LedgerDirection.CREDIT,
                amount=__import__("decimal").Decimal("500000.00"),
                market_id=market.id, note="Dev seed float",
            )
        await db.flush()

        return {
            "admin_token": create_access_token(admin.id, admin.role),
            "agent_token": create_access_token(agent_user.id, agent_user.role),
            "customer_token": create_access_token(customer.id, customer.role),
            "market_id": str(market.id),
            "agent_user_id": str(agent_user.id),
            "note": "Paste a token into Swagger's Authorize as: Bearer <token>",
        }
