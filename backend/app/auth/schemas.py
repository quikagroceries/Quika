import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import UserRole, UserStatus

OtpChannel = Literal["sms", "whatsapp", "voice", "email"]


class RequestOtpIn(BaseModel):
    # Either a phone number or an email — see auth/service.py::normalize_identifier
    # for how the two are told apart.
    identifier: str = Field(..., min_length=3, max_length=255, examples=["+2348012345678", "ada@example.com"])
    # Only meaningful when `identifier` is a phone — an email identifier is
    # always delivered by email regardless of what's sent here.
    channel: OtpChannel | None = Field(default=None, examples=["sms"])


class RequestOtpOut(BaseModel):
    detail: str
    # The channel the code was (nominally) sent on — lets the frontend
    # confirm "Code sent via SMS" without re-deriving the same defaulting
    # logic the backend already applied.
    channel: OtpChannel
    # Only populated outside production — real SMS/WhatsApp dispatch isn't
    # wired up yet, and neither is a real email provider (see service.py),
    # so every channel today behaves like the pre-existing SMS dev fallback.
    dev_otp: str | None = None
    expires_in_seconds: int
    # When the UI should start offering another way to receive the code
    # (WhatsApp / a voice call) if the first one hasn't arrived, and which
    # ways exist for this identifier. An email identifier has no fallback.
    fallback_after_seconds: int = 45
    fallback_channels: list[OtpChannel] = []


class VerifyOtpIn(BaseModel):
    identifier: str = Field(..., examples=["+2348012345678", "ada@example.com"])
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    full_name: str | None = Field(default=None, examples=["Ada Obi"])
    # Only honored outside production (see routes.verify_otp) — lets you spin
    # up an agent/admin test account without hand-editing the DB.
    role: UserRole | None = Field(default=None, examples=["agent"])


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleAuthIn(BaseModel):
    # The ID token credential from Google Identity Services (google.accounts.id).
    credential: str


class GoogleAuthOut(BaseModel):
    # Google vouches for the email itself, so this always logs in or creates
    # an account outright — no separate phone/OTP bridge needed.
    access_token: str


class UpdateProfileIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120, examples=["Ada Obi"])
    default_delivery_address: str | None = Field(default=None, examples=["12 Allen Avenue, Ikeja"])
    # Sending null (or "") REMOVES the photo; omitting the field leaves it
    # alone - the route tells the two apart via model_fields_set. Only images
    # hosted on our Cloudinary account are accepted, so a profile can't point
    # at an arbitrary URL (tracking pixels, javascript:, someone else's host).
    avatar_url: str | None = Field(default=None, max_length=500)

    @field_validator("avatar_url")
    @classmethod
    def _avatar_must_be_ours(cls, v):
        if v in (None, ""):
            return None
        if not v.startswith("https://res.cloudinary.com/"):
            raise ValueError("Profile photos must be uploaded through Qyka")
        return v


class LinkEmailIn(BaseModel):
    # The caller must have already requested a code for this exact email via
    # POST /auth/request-otp (identifier=email) before calling this.
    email: str = Field(..., examples=["ada@example.com"])
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str | None
    email: str | None
    full_name: str | None
    avatar_url: str | None = None
    default_delivery_address: str | None
    role: UserRole
    status: UserStatus
    is_phone_verified: bool
    is_email_verified: bool
    basket_cap_kobo: int
    non_payment_count: int
    # Set when a payment window lapsed on a prior order; drives 100% up-front
    # deposits on this customer's next order (see orders.fees.required_deposit)
    # instead of the normal 20%-above-threshold rule. Exposed so the frontend
    # can explain that up front rather than showing a flat "20%" that's wrong
    # for a flagged customer.
    must_prepay: bool
