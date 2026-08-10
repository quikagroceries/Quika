"""Agent rating (#7): after an order is complete, the customer can rate the
agent who shopped it - 1-5 stars plus an optional comment. Customer feedback
only - never read by assignment (orders.assignment) or agent pay
(orders.fees). One rating per completed order, from that order's own
customer, and only once.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import OrderStatus
from app.orders.service import _load
from app.ratings.models import AgentRating

RATEABLE_STATUSES = (OrderStatus.DELIVERED, OrderStatus.CLOSED)


async def get_rating(db: AsyncSession, order_id: uuid.UUID) -> AgentRating | None:
    result = await db.execute(
        select(AgentRating).where(AgentRating.order_id == order_id)
    )
    return result.scalar_one_or_none()


async def rate_agent(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
    customer_id: uuid.UUID,
    stars: int,
    comment: str | None,
) -> AgentRating:
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status not in RATEABLE_STATUSES:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only a completed order can be rated"
        )
    if order.agent_id is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This order has no agent to rate")
    if await get_rating(db, order_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This order has already been rated")

    rating = AgentRating(
        order_id=order_id,
        agent_id=order.agent_id,
        customer_id=customer_id,
        stars=stars,
        comment=comment,
    )
    db.add(rating)
    await db.flush()
    return rating
