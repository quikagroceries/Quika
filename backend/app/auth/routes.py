from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service
from app.auth.models import User
from app.auth.schemas import (
    RequestOtpIn,
    RequestOtpOut,
    TokenOut,
    UpdateProfileIn,
    UserOut,
    VerifyOtpIn,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserStatus
from app.core.security import create_access_token, get_current_user

router = APIRouter()


@router.post("/request-otp", response_model=RequestOtpOut)
async def request_otp(
    body: RequestOtpIn, db: AsyncSession = Depends(get_db)
) -> RequestOtpOut:
    code = await service.create_otp(db, body.phone)
    # Expose the code only outside production so the flow is testable.
    dev_otp = code if settings.environment != "production" else None
    return RequestOtpOut(
        detail="OTP sent",
        dev_otp=dev_otp,
        expires_in_seconds=settings.otp_expire_minutes * 60,
    )


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(
    body: VerifyOtpIn, db: AsyncSession = Depends(get_db)
) -> TokenOut:
    ok = await service.verify_otp(db, body.phone, body.code)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )
    # role selection is a dev/test convenience only — never let it through
    # in production, or anyone could self-assign admin.
    requested_role = body.role if settings.environment != "production" else None
    user = await service.get_or_create_user(
        db, body.phone, body.full_name, role=requested_role
    )
    if user.status is UserStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked",
        )
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UpdateProfileIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    return await service.update_profile(
        db,
        current_user,
        full_name=body.full_name,
        default_delivery_address=body.default_delivery_address,
    )
