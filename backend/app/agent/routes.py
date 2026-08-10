from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import service
from app.agent.schemas import AgentSummaryOut, SetAvailabilityIn
from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import require_role

router = APIRouter()


@router.get("/summary", response_model=AgentSummaryOut)
async def summary(
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> AgentSummaryOut:
    """Earnings (today/week/total), task counts, availability, and
    completed-order history with each order's agent share — the Dashboard tab."""
    return AgentSummaryOut(**await service.get_summary(db, user_id=agent.id))


@router.patch("/availability", response_model=AgentSummaryOut)
async def set_availability(
    body: SetAvailabilityIn,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> AgentSummaryOut:
    """Pause/resume new assignments only - never touches an order already
    in progress. Returns the refreshed summary so the frontend has one
    response shape to handle everywhere."""
    await service.set_availability(db, user_id=agent.id, is_available=body.is_available)
    return AgentSummaryOut(**await service.get_summary(db, user_id=agent.id))
