"""Auth service — OTP lifecycle and user provisioning.

Kept out of the route handlers so the logic is testable without HTTP. In
development the generated OTP is returned to the caller (no SMS provider yet);
in production this is where you'd hand off to Termii / Africa's Talking.
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import OtpCode, User
from app.core.config import settings
from app.core.enums import UserRole, UserStatus
from app.core.phone import normalize_phone


def _generate_code() -> str:
    # 6-digit, cryptographically random, zero-padded.
    return f"{secrets.randbelow(1_000_000):06d}"


async def create_otp(db: AsyncSession, phone: str) -> str:
    """Issue a fresh code, after checking the request-side rate limit.

    Caps how many codes one phone number can request per hour — without this,
    the endpoint is a free SMS bomb (cost + harassment) once SMS is live.
    """
    phone = normalize_phone(phone)
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    result = await db.execute(
        select(func.count()).select_from(OtpCode).where(
            OtpCode.phone == phone, OtpCode.created_at >= window_start
        )
    )
    recent_count = result.scalar_one()
    if recent_count >= settings.otp_max_requests_per_hour:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many codes requested for this number. Try again later.",
        )

    code = _generate_code()
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.otp_expire_minutes
    )
    db.add(OtpCode(phone=phone, code=code, expires_at=expires))
    await db.flush()
    # In production: send `code` via SMS here instead of returning it.
    return code


async def verify_otp(db: AsyncSession, phone: str, code: str) -> bool:
    """Check the newest unconsumed code for this phone. Consume on success.

    Wrong guesses increment that code's attempt counter; hitting the cap
    invalidates the code outright (the brute-force lock) even though the
    correct code was never entered — a fresh request-otp is then required.

    The failure paths COMMIT (not just flush): the caller (the route) raises
    an HTTPException whenever this returns False, and get_db's dependency
    rolls back the session on any exception. A bare flush() here would get
    silently undone by that rollback, so the attempt counter would never
    actually persist and the brute-force lock could never engage.
    """
    phone = normalize_phone(phone)
    result = await db.execute(
        select(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if otp is None:
        return False
    if otp.attempts >= settings.otp_max_verify_attempts:
        otp.consumed = True
        await db.commit()
        return False
    now = datetime.now(timezone.utc)
    expires = otp.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        return False
    if otp.code != code:
        otp.attempts += 1
        if otp.attempts >= settings.otp_max_verify_attempts:
            otp.consumed = True
        await db.commit()
        return False
    otp.consumed = True
    await db.flush()
    return True


async def get_or_create_user(
    db: AsyncSession,
    phone: str,
    full_name: str | None,
    role: UserRole | None = None,
) -> User:
    phone = normalize_phone(phone)
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone,
            full_name=full_name,
            role=role or UserRole.CUSTOMER,
            is_phone_verified=True,
            status=UserStatus.ACTIVE,
            basket_cap_kobo=settings.default_basket_cap_kobo,
        )
        db.add(user)
        await db.flush()
    else:
        user.is_phone_verified = True
        if full_name and not user.full_name:
            user.full_name = full_name
        await db.flush()
    return user


async def update_profile(
    db: AsyncSession,
    user: User,
    *,
    full_name: str | None = None,
    default_delivery_address: str | None = None,
) -> User:
    """Save the profile fields collected on first login. Only touches a field
    when the caller actually sent one — an omitted field must not wipe out a
    value the user (or a previous call) already set."""
    if full_name is not None:
        user.full_name = full_name
    if default_delivery_address is not None:
        user.default_delivery_address = default_delivery_address
    await db.flush()
    return user
