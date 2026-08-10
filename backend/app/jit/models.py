import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import TransactionStatus


class SpendingAuthorization(Base):
    """Per-order spending ceiling. NOT a wallet — no money sits here.

    It is a permission: the agent may transfer up to `cap` for this order.
    `spent` tracks actual vendor transfers. The float pool is the only place
    real money lives; this just bounds what the agent may draw from it.

    The cap starts at the customer's goods estimate and can be raised ONLY by
    explicit customer approval (price overage or added items).
    """

    __tablename__ = "spending_authorizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id"), unique=True, index=True
    )
    cap: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    spent: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Seller(Base):
    """A market seller as an entity, separate from the account that receives.

    Registered separately so price/behaviour can be tracked per seller even
    when payment routes through a third-party account (POS/neighbour).
    """

    __tablename__ = "sellers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    market_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    name: Mapped[str] = mapped_column(String(120))
    stall_description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)


class VendorAccount(Base):
    """A receiving account. Registered so first-time accounts can be flagged.

    times_used / distinct agents lets the system spot the fraud signal: an
    account only ever paid by ONE agent is almost certainly not a real vendor.
    """

    __tablename__ = "vendor_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    account_number: Mapped[str] = mapped_column(String(20), index=True)
    bank_code: Mapped[str] = mapped_column(String(10))
    account_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    is_third_party: Mapped[bool] = mapped_column(Boolean, default=False)


class VendorTransfer(Base):
    """A real payment to a vendor. This IS the receipt.

    Under JIT the item's confirmed price equals this transfer's amount — the
    price and the payment are the same verified fact. `fee` is what the rail
    charged; `emtl` is the ₦50 stamp duty when >= ₦10,000.
    """

    __tablename__ = "vendor_transfers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id"), index=True
    )
    seller_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    account_number: Mapped[str] = mapped_column(String(20))
    bank_code: Mapped[str] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    emtl: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    reference: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus), default=TransactionStatus.PENDING
    )
    # Purchase photo (proof of goods). A reference/URL into file storage, never
    # the bytes. One photo may cover several items bought together.
    photo_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
