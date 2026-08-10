"""Float pool service — the recycled working capital, now PER MARKET.

Each market has its own pool (blast-radius containment + clean per-market
economics). The ledger is append-only; balance is derived from the latest
entry for that market.

CONCURRENCY: before a debit, we lock the market's pool_locks row with
SELECT ... FOR UPDATE. Two concurrent draws on the same pool then serialize —
the second waits, then reads the true (already-decremented) balance and is
correctly rejected if it no longer fits. Different markets never block each
other. On SQLite (tests) FOR UPDATE is a no-op, which is fine — the logic is
identical; the lock only matters under real concurrent Postgres.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import LedgerDirection
from app.float.models import FloatLedger, PoolLock


async def get_pool_balance(
    db: AsyncSession, market_id: uuid.UUID | None = None
) -> Decimal:
    """Balance of a market's pool = balance_after of its most recent entry.

    market_id=None reads the legacy/global pool (entries with NULL market_id),
    preserving the old behaviour for anything not yet market-scoped.
    """
    stmt = select(FloatLedger.balance_after)
    if market_id is None:
        stmt = stmt.where(FloatLedger.market_id.is_(None))
    else:
        stmt = stmt.where(FloatLedger.market_id == market_id)
    stmt = stmt.order_by(FloatLedger.seq.desc()).limit(1)
    result = await db.execute(stmt)
    latest = result.scalar_one_or_none()
    return latest if latest is not None else Decimal("0.00")


async def _acquire_lock(db: AsyncSession, market_id: uuid.UUID) -> None:
    """Lock this market's pool row, creating it if missing.

    SELECT ... FOR UPDATE serializes concurrent debits on the same pool.
    """
    result = await db.execute(
        select(PoolLock).where(PoolLock.market_id == market_id).with_for_update()
    )
    lock = result.scalar_one_or_none()
    if lock is None:
        db.add(PoolLock(market_id=market_id))
        await db.flush()


async def record_movement(
    db: AsyncSession,
    *,
    direction: LedgerDirection,
    amount: Decimal,
    market_id: uuid.UUID | None = None,
    order_id=None,
    note: str | None = None,
) -> FloatLedger:
    """Append a movement to a market's pool ledger and return the new entry.

    DEBIT  -> money leaves the pool (agent buying at market)
    CREDIT -> money returns to the pool (customer payment / deposit)

    For a market-scoped debit, the pool row is locked first so concurrent draws
    can't both read a stale balance and overdraw.
    """
    if amount <= 0:
        raise ValueError("Movement amount must be positive")

    # Serialize debits on this pool. (Credits don't risk overdraw, but locking
    # them too keeps the balance read consistent under concurrency.)
    if market_id is not None:
        await _acquire_lock(db, market_id)

    current = await get_pool_balance(db, market_id)
    if direction is LedgerDirection.DEBIT:
        if amount > current:
            raise ValueError("Insufficient float pool balance")
        new_balance = current - amount
    else:
        new_balance = current + amount

    entry = FloatLedger(
        order_id=order_id,
        market_id=market_id,
        direction=direction,
        amount=amount,
        balance_after=new_balance,
        note=note,
    )
    db.add(entry)
    await db.flush()
    return entry


async def transfer_between_pools(
    db: AsyncSession,
    *,
    from_market: uuid.UUID,
    to_market: uuid.UUID,
    amount: Decimal,
    note: str | None = None,
) -> None:
    """Admin move of float from one market's pool to another.

    Handles the 'money trapped in a quiet market while a busy one runs dry'
    case. Recorded as a debit on the source and a credit on the destination.
    """
    await record_movement(
        db, direction=LedgerDirection.DEBIT, amount=amount, market_id=from_market,
        note=note or f"Transfer to market {to_market}",
    )
    await record_movement(
        db, direction=LedgerDirection.CREDIT, amount=amount, market_id=to_market,
        note=note or f"Transfer from market {from_market}",
    )
