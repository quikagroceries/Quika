"""Auth service — OTP lifecycle and user provisioning.

Kept out of the route handlers so the logic is testable without HTTP. Primary
ID is EITHER a phone or an email (see normalize_identifier) — whichever a
person signs up with becomes their account's identifier; the other can be
added later (e.g. by linking Google). In development the generated OTP is
returned to the caller; in production this is where you'd hand off to a real
SMS/WhatsApp provider (Termii, Africa's Talking, 360dialog...) or an email
sender (Resend, Postmark, SES...) — none are wired up yet.
"""

import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth.models import OtpCode, User
from app.core.config import settings
from app.core.enums import UserRole, UserStatus
from app.core.phone import normalize_phone

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_identifier(raw: str) -> tuple[str, str]:
    """Returns (normalized_value, "phone" | "email"). Whatever looks like an
    email (has an "@") is treated as one; everything else goes through phone
    normalization, so this fails loudly on garbage input rather than silently
    misfiling it as a phone number."""
    raw = raw.strip()
    if "@" in raw:
        email = raw.lower()
        if not _EMAIL_RE.match(email):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That doesn't look like a valid email")
        return email, "email"
    return normalize_phone(raw), "phone"


def _generate_code() -> str:
    # 6-digit, cryptographically random, never starting with 0 - the voice
    # call takes the code as a number, where a leading zero would be dropped
    # and the caller would hear the wrong digits.
    return str(secrets.randbelow(900_000) + 100_000)


async def create_otp(db: AsyncSession, identifier: str, channel: str) -> str:
    """Issue a fresh code, after checking the request-side rate limit.

    Caps how many codes one identifier can request per hour — without this,
    the endpoint is a free SMS bomb (cost + harassment) once a real provider
    is live.
    """
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    result = await db.execute(
        select(func.count()).select_from(OtpCode).where(
            OtpCode.identifier == identifier, OtpCode.created_at >= window_start
        )
    )
    recent_count = result.scalar_one()
    if recent_count >= settings.otp_max_requests_per_hour:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many codes requested for this identifier. Try again later.",
        )

    # Resend cooldown: a code requested moments ago is still on its way. Without
    # this the fallback buttons (or a script) could fire repeated paid
    # SMS/voice sends at one number.
    latest = (
        await db.execute(
            select(OtpCode.created_at)
            .where(OtpCode.identifier == identifier)
            .order_by(OtpCode.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if latest is not None and settings.otp_resend_cooldown_seconds > 0:
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        wait = settings.otp_resend_cooldown_seconds - (datetime.now(timezone.utc) - latest).total_seconds()
        if wait > 0:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"A code was just sent. You can request another in {int(wait) + 1} seconds.",
                headers={"Retry-After": str(int(wait) + 1)},
            )

    code = _generate_code()
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.otp_expire_minutes
    )
    db.add(OtpCode(identifier=identifier, channel=channel, code=code, expires_at=expires))
    await db.flush()
    # In production: dispatch `code` via the real channel here (SMS/WhatsApp
    # provider, or an email sender) instead of returning it.
    return code


async def verify_otp(db: AsyncSession, identifier: str, code: str) -> bool:
    """Check the newest unconsumed code for this identifier. Consume on success.

    Wrong guesses increment that code's attempt counter; hitting the cap
    invalidates the code outright (the brute-force lock) even though the
    correct code was never entered — a fresh request-otp is then required.

    The failure paths COMMIT (not just flush): the caller (the route) raises
    an HTTPException whenever this returns False, and get_db's dependency
    rolls back the session on any exception. A bare flush() here would get
    silently undone by that rollback, so the attempt counter would never
    actually persist and the brute-force lock could never engage.
    """
    result = await db.execute(
        select(OtpCode)
        .where(OtpCode.identifier == identifier, OtpCode.consumed.is_(False))
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


async def verify_google_id_token(credential: str) -> dict:
    """Verify a Google Identity Services ID token and return its claims.

    Runs in a thread pool: the underlying library call is synchronous and,
    on a cache miss, fetches Google's public certs over the network — doing
    that inline would block the event loop.
    """
    if not settings.google_client_id:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in isn't configured"
        )
    try:
        return await run_in_threadpool(
            google_id_token.verify_oauth2_token,
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Google credential")


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> User | None:
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def login_or_create_with_google(db: AsyncSession, claims: dict) -> User:
    """Google already verified this identity, so — unlike phone/email OTP —
    there's no separate verification step: link an existing account or
    create one outright, right here."""
    google_id = claims["sub"]
    email = claims.get("email")
    name = claims.get("name")

    user = await get_user_by_google_id(db, google_id)
    if user is None and email:
        user = await get_user_by_email(db, email)
        if user is not None:
            user.google_id = google_id
            await db.flush()

    if user is not None:
        if user.status is UserStatus.LOCKED:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is locked")
        return user

    if not email:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "That Google account has no email to sign up with.",
        )
    user = User(
        email=email,
        full_name=name,
        role=UserRole.CUSTOMER,
        is_email_verified=True,
        status=UserStatus.ACTIVE,
        basket_cap_kobo=settings.default_basket_cap_kobo,
        google_id=google_id,
    )
    db.add(user)
    await db.flush()
    return user


async def get_or_create_user(
    db: AsyncSession,
    identifier: str,
    id_type: str,
    full_name: str | None,
    role: UserRole | None = None,
) -> User:
    field = User.phone if id_type == "phone" else User.email
    result = await db.execute(select(User).where(field == identifier))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            phone=identifier if id_type == "phone" else None,
            email=identifier if id_type == "email" else None,
            full_name=full_name,
            role=role or UserRole.CUSTOMER,
            is_phone_verified=id_type == "phone",
            is_email_verified=id_type == "email",
            status=UserStatus.ACTIVE,
            basket_cap_kobo=settings.default_basket_cap_kobo,
        )
        db.add(user)
        await db.flush()
    else:
        if id_type == "phone":
            user.is_phone_verified = True
        else:
            user.is_email_verified = True
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
    avatar_url: str | None = None,
    clear_avatar: bool = False,
) -> User:
    """Save the profile fields collected on first login. Only touches a field
    when the caller actually sent one — an omitted field must not wipe out a
    value the user (or a previous call) already set. `clear_avatar` is the one
    explicit way to REMOVE a value (a photo), since None here means "omitted"."""
    if full_name is not None:
        user.full_name = full_name
    if default_delivery_address is not None:
        user.default_delivery_address = default_delivery_address
    if clear_avatar:
        user.avatar_url = None
    elif avatar_url is not None:
        user.avatar_url = avatar_url
    await db.flush()
    return user


async def link_email(db: AsyncSession, user: User, email: str, code: str) -> User:
    """Attach a verified email to an already-authenticated account (e.g. a
    phone signup adding an email later). Goes through the same OTP the
    caller must have already requested via POST /auth/request-otp with this
    email as the identifier — mirrors the trust level phone/Google already
    get, rather than accepting an unverified email straight from a form."""
    ok = await verify_otp(db, email, code)
    if not ok:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Invalid or expired code"
        )
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing is not None and existing.id != user.id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That email is already linked to another account"
        )
    user.email = email
    user.is_email_verified = True
    await db.flush()
    return user
