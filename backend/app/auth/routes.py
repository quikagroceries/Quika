from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import otp_delivery, service
from app.auth.models import User
from app.auth.schemas import (
    GoogleAuthIn,
    GoogleAuthOut,
    LinkEmailIn,
    RegisterCustomerIn,
    RequestOtpIn,
    RequestOtpOut,
    TokenOut,
    UpdateProfileIn,
    UserOut,
    VerifyOtpIn,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserRole, UserStatus
from app.core.security import create_access_token, get_current_user

router = APIRouter()


# Admins sign in with email+password only (POST /admin/login) - every
# passwordless route here refuses an admin account outright.
def _admin_use_admin_login() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin accounts sign in at the admin login page",
    )


@router.post("/request-otp", response_model=RequestOtpOut)
async def request_otp(
    body: RequestOtpIn, db: AsyncSession = Depends(get_db)
) -> RequestOtpOut:
    identifier, id_type = service.normalize_identifier(body.identifier)
    # An email identifier can only ever be delivered by email; a phone
    # identifier honors the caller's chosen channel (default sms).
    channel = "email" if id_type == "email" else (body.channel or "sms")
    if id_type == "email" and channel != "email":
        channel = "email"
    code = await service.create_otp(db, identifier, channel)

    # Phone codes go out over the chosen channel. Email has no provider wired
    # yet and stays dev-only (see service.create_otp).
    if id_type == "phone":
        try:
            await otp_delivery.deliver_otp(identifier, code, channel)
        except otp_delivery.OtpDeliveryError:
            # Raising rolls the just-created code back (get_db), so a failed
            # send leaves nothing behind. The message steers the user to the
            # other routes, which is exactly what the UI offers next.
            if settings.environment == "production":
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "We couldn't send that code. Try receiving it another way - WhatsApp or a call.",
                )

    # Expose the code only outside production so the flow is testable.
    dev_otp = code if settings.environment != "production" else None
    return RequestOtpOut(
        detail="OTP sent",
        channel=channel,
        dev_otp=dev_otp,
        expires_in_seconds=settings.otp_expire_minutes * 60,
        fallback_after_seconds=settings.otp_fallback_after_seconds,
        fallback_channels=["sms", "whatsapp", "voice"] if id_type == "phone" else [],
    )


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(
    body: VerifyOtpIn, db: AsyncSession = Depends(get_db)
) -> TokenOut:
    identifier, id_type = service.normalize_identifier(body.identifier)
    ok = await service.verify_otp(db, identifier, body.code)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )
    # role selection is a dev/test convenience only — never let it through in
    # production, or anyone could self-assign a role. ADMIN is excluded even
    # in dev: admins are strictly email+password via POST /admin/login (see
    # admin.service.authenticate_admin/bootstrap_admin), never phone/OTP.
    requested_role = (
        body.role
        if settings.environment != "production" and body.role is not UserRole.ADMIN
        else None
    )
    user = await service.get_or_create_user(
        db, identifier, id_type, body.full_name, role=requested_role
    )
    if user.status is UserStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked",
        )
    # Blocking ADMIN as a *requested* role above isn't enough - an account
    # that already is an admin would otherwise get an admin token here with
    # no password at all.
    if user.role is UserRole.ADMIN:
        raise _admin_use_admin_login()
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.post("/google", response_model=GoogleAuthOut)
async def google_auth(
    body: GoogleAuthIn, db: AsyncSession = Depends(get_db)
) -> GoogleAuthOut:
    """Google already verified the identity, so this always completes in one
    step — link an existing account or create one outright (see
    service.login_or_create_with_google) — never a separate phone/OTP step."""
    claims = await service.verify_google_id_token(body.credential)
    user = await service.login_or_create_with_google(db, claims)
    # A Google account on an admin's email would otherwise skip the password.
    if user.role is UserRole.ADMIN:
        raise _admin_use_admin_login()
    token = create_access_token(user.id, user.role)
    return GoogleAuthOut(access_token=token)


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
        avatar_url=body.avatar_url,
        clear_avatar="avatar_url" in body.model_fields_set and body.avatar_url is None,
    )


@router.post("/me/register-customer", response_model=UserOut)
async def register_customer(
    body: RegisterCustomerIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """An agent-only account (approved from the public For Agents page)
    registering as a customer on the same number - unlocks the shopping
    side and the agent/customer switch. Everyone else already has one."""
    if current_user.has_customer_side:
        raise HTTPException(status.HTTP_409_CONFLICT, "You're already registered as a customer")
    if body.full_name and body.full_name.strip():
        current_user.full_name = body.full_name.strip()
    if body.default_delivery_address and body.default_delivery_address.strip():
        current_user.default_delivery_address = body.default_delivery_address.strip()
    current_user.has_customer_side = True
    await db.flush()
    return current_user


@router.post("/link-email", response_model=UserOut)
async def link_email(
    body: LinkEmailIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Attach a verified email to the signed-in account. The frontend must
    call POST /auth/request-otp with identifier=email first to get a code
    sent, then this verifies it the same way sign-in/sign-up does."""
    email, id_type = service.normalize_identifier(body.email)
    if id_type != "email":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That doesn't look like a valid email")
    return await service.link_email(db, current_user, email, body.code)
