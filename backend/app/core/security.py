"""JWT creation/verification and the current-user dependency.

Route handlers that need an authenticated user depend on `get_current_user`.
Role-gating (agent-only, admin-only endpoints) builds on top of this via
`require_role`.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import settings
from app.core.enums import UserStatus
from app.core.database import get_db
from app.core.enums import UserRole

# Login is a custom phone+OTP flow, not OAuth2 password grant, so the docs
# "Authorize" button just needs a plain bearer-token field.
# auto_error=False so a missing header surfaces as our own 401 below, not
# HTTPBearer's default 403 (which would break the "missing token" contract).
bearer_scheme = HTTPBearer(auto_error=False)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(user_id: uuid.UUID, role: UserRole) -> str:
    minutes = (
        settings.admin_token_expire_minutes
        if role == UserRole.ADMIN
        else settings.access_token_expire_minutes
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": str(user_id), "role": role.value, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise cred_exc
    try:
        payload = jwt.decode(
            creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise cred_exc
    except JWTError:
        raise cred_exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise cred_exc
    if user.status is UserStatus.SUSPENDED:
        # Unlike LOCKED (checked only at login), this must also cut off a
        # token issued before the suspension - an admin soft-delete has to
        # take effect immediately, not just block the next sign-in.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been suspended")
    return user


async def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user, but returns None when no/invalid token (public routes)."""
    if creds is None:
        return None
    try:
        payload = jwt.decode(
            creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    return result.scalar_one_or_none()


async def get_customer_user(user: User = Depends(get_current_user)) -> User:
    """get_current_user, for the customer-side entry points (placing an
    order, funding the wallet): refuses an agent-only account that hasn't
    registered as a customer (see auth.models.User.has_customer_side)."""
    if not user.has_customer_side:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Register as a customer to shop",
        )
    return user


def require_role(*roles: UserRole):
    """Dependency factory: gate an endpoint to specific roles."""

    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        # An admin on a temporary password can sign in, but can't use a
        # single admin endpoint until they set their own (POST
        # /admin/me/password, which depends on get_current_user instead).
        if user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Password change required",
            )
        return user

    return checker
