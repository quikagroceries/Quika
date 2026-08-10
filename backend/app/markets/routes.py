import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, require_role
from app.markets import service
from app.markets.models import Market
from app.markets.schemas import (
    AgentStatusOut,
    CreateMarketIn,
    MarketOut,
    SetDutyIn,
    UpdateMarketIn,
)

router = APIRouter()


@router.post("", response_model=MarketOut, status_code=201)
async def create_market(
    body: CreateMarketIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> Market:
    return await service.create_market(
        db, name=body.name, city=body.city, state=body.state,
        latitude=body.latitude, longitude=body.longitude,
    )


@router.patch("/{market_id}", response_model=MarketOut)
async def update_market(
    market_id: uuid.UUID,
    body: UpdateMarketIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> Market:
    return await service.update_market(db, market_id=market_id, **body.model_dump())


@router.get("", response_model=list[MarketOut])
async def list_markets(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Market]:
    return await service.list_markets(db, active_only=active_only)


@router.get("/agents/me", response_model=AgentStatusOut)
async def my_agent_status(
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> AgentStatusOut:
    """The current agent's own on_duty/availability - drives the in-app
    agent/customer view switch and its default on load."""
    return await service.get_my_agent_status(db, user_id=agent.id)


@router.patch("/agents/me/duty", response_model=AgentStatusOut)
async def set_my_duty(
    body: SetDutyIn,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> AgentStatusOut:
    """Flip between agent view (on_duty=true) and customer view (false)."""
    return await service.set_duty(db, user_id=agent.id, on_duty=body.on_duty)
