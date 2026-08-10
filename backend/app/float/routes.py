import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import LedgerDirection, UserRole
from app.core.security import require_role
from app.float import service
from app.float.schemas import PoolBalanceOut, TopUpIn, TransferIn

router = APIRouter()


@router.get("/balance", response_model=PoolBalanceOut)
async def balance(
    market_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> PoolBalanceOut:
    """market_id omitted reads the legacy/global pool, as before."""
    return PoolBalanceOut(balance=await service.get_pool_balance(db, market_id))


@router.post("/top-up", response_model=PoolBalanceOut)
async def top_up(
    body: TopUpIn,
    market_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> PoolBalanceOut:
    """market_id omitted credits the legacy/global pool, as before."""
    entry = await service.record_movement(
        db,
        direction=LedgerDirection.CREDIT,
        amount=body.amount,
        market_id=market_id,
        note=body.note or "Admin top-up",
    )
    return PoolBalanceOut(balance=entry.balance_after)


@router.post("/transfer", response_model=dict)
async def transfer(
    body: TransferIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Move float from one market's pool to another - the "quiet market
    subsidizes a busy one" case. Thin route over the already-tested
    transfer_between_pools (locked debit + credit, refuses to overdraw the
    source); this just exposes it over HTTP."""
    try:
        await service.transfer_between_pools(
            db,
            from_market=body.from_market_id,
            to_market=body.to_market_id,
            amount=body.amount,
            note=body.note,
        )
    except ValueError:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Source market's float pool has insufficient balance for this transfer",
        )
    return {
        "from_market_id": str(body.from_market_id),
        "to_market_id": str(body.to_market_id),
        "amount": str(body.amount),
        "from_balance": str(await service.get_pool_balance(db, body.from_market_id)),
        "to_balance": str(await service.get_pool_balance(db, body.to_market_id)),
    }
