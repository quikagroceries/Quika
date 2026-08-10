import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID

# Use Postgres JSONB in production, fall back to generic JSON elsewhere.
JsonType = JSONB().with_variant(JSON(), "sqlite")
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import TransactionStatus


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("orders.id"), index=True, nullable=True
    )
    paystack_reference: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.PENDING
    )
    # How the split broke down: company / agent / rider shares
    split_breakdown: Mapped[dict | None] = mapped_column(JsonType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
