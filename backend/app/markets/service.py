import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.markets.models import Agent, Market


async def create_market(
    db: AsyncSession,
    *,
    name: str,
    city: str,
    state: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Market:
    market = Market(name=name, city=city, state=state, latitude=latitude, longitude=longitude)
    db.add(market)
    await db.flush()
    return market


async def list_markets(db: AsyncSession, *, active_only: bool) -> list[Market]:
    stmt = select(Market)
    if active_only:
        stmt = stmt.where(Market.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_market(
    db: AsyncSession,
    *,
    market_id: uuid.UUID,
    name: str | None = None,
    city: str | None = None,
    state: str | None = None,
    is_active: bool | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Market:
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()
    if market is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")
    if name is not None:
        market.name = name
    if city is not None:
        market.city = city
    if state is not None:
        market.state = state
    if is_active is not None:
        market.is_active = is_active
    if latitude is not None:
        market.latitude = latitude
    if longitude is not None:
        market.longitude = longitude
    await db.flush()
    return market


async def _get_agent(db: AsyncSession, user_id: uuid.UUID) -> Agent:
    result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent record not found")
    return agent


async def get_my_agent_status(db: AsyncSession, *, user_id: uuid.UUID) -> Agent:
    return await _get_agent(db, user_id)


async def set_duty(db: AsyncSession, *, user_id: uuid.UUID, on_duty: bool) -> Agent:
    """Flip an agent between their agent view (on_duty) and customer view.

    Going off-duty is refused while the agent has a live order (assigned or
    actively shopping) - the agent-side analog of "you can't clock out
    mid-delivery". Auto-assignment (orders.assignment.find_available_agent)
    already requires on_duty, so once this succeeds the agent is out of the
    pool and can never be handed a new order - including one they place
    themselves while shopping as a customer.
    """
    agent = await _get_agent(db, user_id)
    if not on_duty:
        from app.core.enums import OrderStatus
        from app.orders.models import Order
        result = await db.execute(
            select(Order.id).where(
                Order.agent_id == user_id,
                Order.status.in_([OrderStatus.AGENT_ASSIGNED, OrderStatus.SHOPPING]),
            ).limit(1)
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Finish or release your current order before switching to customer mode",
            )
    agent.on_duty = on_duty
    await db.flush()
    return agent
