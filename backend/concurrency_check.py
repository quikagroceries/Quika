"""Prove the per-market pool lock prevents overdraw under real concurrency.

Fire many simultaneous vendor payments against ONE market pool that only has
enough money for SOME of them. With correct locking, exactly the affordable
number succeed and the pool never goes negative. Without locking, more succeed
than the pool could fund, and the balance goes below zero.
"""

import asyncio
import uuid
from decimal import Decimal

from app.core.database import AsyncSessionLocal
from app.core.enums import LedgerDirection
from app.float import service as float_service
import app.models  # noqa: F401  (registers every model/table before any DB op)


async def seed_pool(market_id, amount):
    async with AsyncSessionLocal() as db:
        await float_service.record_movement(
            db, direction=LedgerDirection.CREDIT, amount=amount,
            market_id=market_id, note="concurrency seed",
        )
        await db.commit()


async def try_draw(market_id, amount, results, idx):
    """One attempted debit in its OWN session — like a separate request."""
    try:
        async with AsyncSessionLocal() as db:
            await float_service.record_movement(
                db, direction=LedgerDirection.DEBIT, amount=amount,
                market_id=market_id, note=f"draw {idx}",
            )
            await db.commit()
            results[idx] = "ok"
    except Exception as e:
        results[idx] = f"rejected: {type(e).__name__}"


async def main():
    market_id = uuid.uuid4()
    # Pool holds 10,000. Each draw is 3,000. Only 3 can possibly succeed
    # (3 x 3,000 = 9,000). The 4th and beyond must be rejected.
    await seed_pool(market_id, Decimal("10000"))

    results = {}
    draws = [try_draw(market_id, Decimal("3000"), results, i) for i in range(6)]
    await asyncio.gather(*draws)

    async with AsyncSessionLocal() as db:
        final = await float_service.get_pool_balance(db, market_id)

    ok = sum(1 for v in results.values() if v == "ok")
    print(f"Successful draws: {ok} (expected 3)")
    print(f"Final balance: {final} (expected 1000, must NOT be negative)")
    print("Results:", results)
    assert final >= 0, "POOL WENT NEGATIVE — locking is not working"
    assert ok == 3, f"Expected exactly 3 draws to succeed, got {ok}"
    print("PASS: locking held under concurrency")


if __name__ == "__main__":
    asyncio.run(main())