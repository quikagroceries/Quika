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
    # Primary ID is EITHER phone or email — at least one is always set (enforced
    # in auth/service.py::get_or_create_user, not a DB constraint). A phone
    # signup can later gain an email (and vice versa) by linking Google, so
    # both being set on one row is normal, not a sign of two accounts merging.
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Profile photo: an https URL to an already-uploaded image (the browser
    # uploads straight to Cloudinary, same as chat photos - no bytes ever touch
    # this server). Validated in the profile-update schema; cosmetic only.
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
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
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

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
    # Normalized phone (+234...) or lowercased email — whichever the caller
    # signed in with (see auth/service.py::normalize_identifier).
    identifier: Mapped[str] = mapped_column(String(255), index=True)
    # Where this code was (nominally) sent: "sms" | "whatsapp" | "email".
    # Real dispatch per channel isn't wired up yet outside email's dev
    # fallback — see service.create_otp — but the record still matters for
    # support/debugging.
    channel: Mapped[str] = mapped_column(String(10), default="sms")
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
