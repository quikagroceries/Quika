import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import UserRole, UserStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Saved address, offered as a default when a new order asks for one.
    # Purely a convenience prefill — never used by any money/eligibility logic.
    default_delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.CUSTOMER
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus), default=UserStatus.ACTIVE
    )

    # Verification
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Risk model — load-bearing from day one.
    # basket_cap is the max order total (in kobo) this user may place.
    basket_cap_kobo: Mapped[int] = mapped_column(Integer, default=500_000)
    non_payment_count: Mapped[int] = mapped_column(Integer, default=0)
    # Below-threshold non-payers must pay 100% up front on their next order.
    # Set when a payment window lapses; cleared after they successfully prepay
    # and complete an order.
    must_prepay: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code: Mapped[str] = mapped_column(String(6))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    # Wrong-guess counter for THIS code. Once it hits the limit the code is
    # invalidated (consumed) even though it was never guessed correctly —
    # this is the brute-force lock: a fresh code must be requested.
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
