import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import LedgerDirection


class FloatLedger(Base):
    """Append-only ledger of the company float pool.

    NEVER update a balance in place. Every movement is a new row. The pool
    balance is derived from the sum of entries (or read from balance_after of
    the latest row). This gives a full audit trail for free.
    """

    __tablename__ = "float_ledger"

    # Monotonic autoincrement primary key — the reliable ordering key.
    # created_at can tie when rows are written in the same instant.
    # Explicit Identity() so it matches Postgres reflection exactly — without
    # it, autogenerate re-flags this column as changed on every run.
    seq: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(),
        primary_key=True,
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, index=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id"), nullable=True, index=True
    )
    # Which market's pool this movement belongs to. NULL = legacy/global pool
    # (kept working for backward compatibility and cross-market admin transfers).
    market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    direction: Mapped[LedgerDirection] = mapped_column(Enum(LedgerDirection))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PoolLock(Base):
    """One row per market pool. Used purely as a lock target.

    Concurrent vendor payments on the same market pool must not both read a
    stale balance and overdraw. Before a debit, the service locks this row
    (SELECT ... FOR UPDATE); the second payment waits for the first to finish,
    then reads the true balance. This serializes draws per market — different
    markets never block each other.
    """

    __tablename__ = "pool_locks"

    market_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
    )
