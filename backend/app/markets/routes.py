import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, get_current_user_optional, require_role
from app.markets import service
from app.markets.models import Market
from app.jit.models import Seller
from app.markets.schemas import (
    AgentStatusOut,
    CreateMarketIn,
    CreateVendorIn,
    MarketOut,
    SetDutyIn,
    ShopActivityOut,
    UpdateMarketIn,
    VendorOut,
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
        venue_type=body.venue_type,
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
    venue_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> list[Market]:
    """Active markets are public (guest browse). Listing inactive markets
    requires an authenticated admin.
    """
    if not active_only:
        if user is None or user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return await service.list_markets(db, active_only=active_only, venue_type=venue_type)


@router.get("/activity", response_model=ShopActivityOut)
async def shop_activity(db: AsyncSession = Depends(get_db)) -> dict:
    """Public pulse for the shop hero — agents on duty + venue counts."""
    return await service.shop_activity(db)


@router.get("/{market_id}/vendors", response_model=list[VendorOut])
async def list_vendors(
    market_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[Seller]:
    """Public stall list for a market — guest shop browse."""
    return await service.list_vendors(db, market_id=market_id)


@router.post("/{market_id}/vendors", response_model=VendorOut, status_code=201)
async def create_vendor(
    market_id: uuid.UUID,
    body: CreateVendorIn,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> Seller:
    """Agent registers a stall on the fly while shopping — live immediately,
    no approval gate. Shows up in list_vendors right away."""
    return await service.create_vendor(
        db, market_id=market_id, name=body.name,
        stall_description=body.stall_description, phone=body.phone,
        latitude=body.latitude, longitude=body.longitude,
    )


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
