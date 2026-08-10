"""Wallet service — fund, spend, refund. Append-only ledger, like the float.

The wallet is one of TWO equal payment options (the other is paying directly
from bank via Paystack). It is not a fallback. It also receives refunds, which
is the main reason it earns its place: money never gets stuck in limbo.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import LedgerDirection
from app.wallet.models import Wallet, WalletLedger


async def get_or_create_wallet(db: AsyncSession, user_id: uuid.UUID) -> Wallet:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if wallet is None:
        wallet = Wallet(user_id=user_id, balance=Decimal("0.00"))
        db.add(wallet)
        await db.flush()
    return wallet


async def _move(
    db: AsyncSession,
    wallet: Wallet,
    *,
    direction: LedgerDirection,
    amount: Decimal,
    order_id: uuid.UUID | None = None,
    note: str | None = None,
) -> Wallet:
    if amount <= 0:
        raise ValueError("Wallet movement must be positive")

    if direction is LedgerDirection.DEBIT:
        if amount > wallet.balance:
            raise ValueError("Insufficient wallet balance")
        wallet.balance = wallet.balance - amount
    else:
        wallet.balance = wallet.balance + amount

    db.add(
        WalletLedger(
            wallet_id=wallet.id,
            order_id=order_id,
            direction=direction,
            amount=amount,
            balance_after=wallet.balance,
            note=note,
        )
    )
    await db.flush()
    return wallet


async def credit(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: Decimal,
    *,
    order_id: uuid.UUID | None = None,
    note: str | None = None,
) -> Wallet:
    """Add money: top-ups and refunds both come through here."""
    wallet = await get_or_create_wallet(db, user_id)
    return await _move(
        db, wallet, direction=LedgerDirection.CREDIT, amount=amount,
        order_id=order_id, note=note,
    )


async def debit(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: Decimal,
    *,
    order_id: uuid.UUID | None = None,
    note: str | None = None,
) -> Wallet:
    """Spend from the wallet. Raises if the balance can't cover it."""
    wallet = await get_or_create_wallet(db, user_id)
    return await _move(
        db, wallet, direction=LedgerDirection.DEBIT, amount=amount,
        order_id=order_id, note=note,
    )


async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> Decimal:
    wallet = await get_or_create_wallet(db, user_id)
    return wallet.balance


async def list_ledger(
    db: AsyncSession, user_id: uuid.UUID, *, limit: int = 100
) -> list[WalletLedger]:
    """This wallet's movements, newest first - top-ups, order debits, refunds.
    Everything here is already recorded by _move(); this just surfaces it."""
    wallet = await get_or_create_wallet(db, user_id)
    result = await db.execute(
        select(WalletLedger)
        .where(WalletLedger.wallet_id == wallet.id)
        .order_by(WalletLedger.seq.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# --- Secure funding via Paystack ---
# Direct credit() must never be exposed to users in production, or they could
# top themselves up for free. Real funding: init_funding() creates a Paystack
# transaction; the wallet is credited ONLY when the signed webhook confirms it.

async def confirm_funding(
    db: AsyncSession, *, user_id, reference: str, amount
) -> "Wallet":
    """Credit a wallet after Paystack confirms a top-up. Idempotent by reference."""
    from sqlalchemy import select as _select
    from app.wallet.models import WalletLedger as _WL
    # If we already recorded this reference, do nothing (webhook retries).
    existing = await db.execute(
        _select(_WL).where(_WL.note == f"Paystack top-up {reference}")
    )
    if existing.scalar_one_or_none() is not None:
        return await get_or_create_wallet(db, user_id)
    return await credit(
        db, user_id, amount, note=f"Paystack top-up {reference}"
    )
