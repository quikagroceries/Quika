import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.security import get_current_user, get_customer_user
from app.wallet import service
from app.wallet.schemas import FundWalletIn, LedgerEntryOut, WalletOut

router = APIRouter()


@router.get("", response_model=WalletOut)
async def my_wallet(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WalletOut:
    balance = await service.get_balance(db, user.id)
    return WalletOut(balance=balance)


@router.get("/transactions", response_model=list[LedgerEntryOut])
async def my_wallet_transactions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LedgerEntryOut]:
    """This wallet's ledger, newest first - top-ups, order debits, refunds."""
    return await service.list_ledger(db, user.id)


@router.post("/fund", response_model=WalletOut)
async def fund_wallet(
    body: FundWalletIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_customer_user),
) -> WalletOut:
    """Top up the wallet.

    NOTE: in production this must be driven by a confirmed Paystack payment
    webhook, not a direct call — otherwise a user could credit themselves.
    Wired to Paystack alongside the courier work.
    """
    from app.core.config import settings
    if settings.environment == "production":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Use /payments/wallet/fund/init in production - direct credit is dev-only",
        )
    wallet = await service.credit(
        db, user.id, body.amount, note="Wallet top-up (dev)"
    )
    return WalletOut(balance=wallet.balance)
