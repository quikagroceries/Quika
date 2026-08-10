import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.security import get_current_user
from app.orders.service import load_order_for_participant
from app.ratings import service
from app.ratings.schemas import AgentRatingOut, RateAgentIn

router = APIRouter()


@router.post("/{order_id}/rating", response_model=AgentRatingOut)
async def rate_agent(
    order_id: uuid.UUID,
    body: RateAgentIn,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> AgentRatingOut:
    """Customer rates the agent who shopped a completed order - once."""
    return await service.rate_agent(
        db, order_id=order_id, customer_id=customer.id,
        stars=body.stars, comment=body.comment,
    )


@router.get("/{order_id}/rating", response_model=AgentRatingOut | None)
async def get_rating(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentRatingOut | None:
    """Same participant gate as chat/purchases - the order's customer or
    assigned agent only."""
    await load_order_for_participant(db, order_id, user.id)
    return await service.get_rating(db, order_id)
