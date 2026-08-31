import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import UserRole, UserStatus


class RequestOtpIn(BaseModel):
    phone: str = Field(..., min_length=7, max_length=20, examples=["+2348012345678"])


class RequestOtpOut(BaseModel):
    detail: str
    # Only populated in development so you can test without an SMS provider.
    dev_otp: str | None = None
    # How long this code is valid for, from the moment this response is
    # sent - lets the frontend show a countdown instead of a customer typing
    # a code that silently expired underneath them. Mirrors
    # settings.otp_expire_minutes exactly.
    expires_in_seconds: int


class VerifyOtpIn(BaseModel):
    phone: str = Field(..., examples=["+2348012345678"])
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    full_name: str | None = Field(default=None, examples=["Ada Obi"])
    # Only honored outside production (see routes.verify_otp) — lets you spin
    # up an agent/admin test account without hand-editing the DB.
    role: UserRole | None = Field(default=None, examples=["agent"])


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfileIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120, examples=["Ada Obi"])
    default_delivery_address: str | None = Field(default=None, examples=["12 Allen Avenue, Ikeja"])


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    full_name: str | None
    default_delivery_address: str | None
    role: UserRole
    status: UserStatus
    is_phone_verified: bool
    basket_cap_kobo: int
    non_payment_count: int
    # Set when a payment window lapsed on a prior order; drives 100% up-front
    # deposits on this customer's next order (see orders.fees.required_deposit)
    # instead of the normal DEPOSIT_RATE-above-threshold rule. Exposed so the
    # frontend can explain that up front rather than showing a flat percentage
    # that's wrong for a flagged customer.
    must_prepay: bool
