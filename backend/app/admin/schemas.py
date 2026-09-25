from pydantic import BaseModel, Field

from app.core.enums import RiderStatus


class AdminLoginIn(BaseModel):
    email: str = Field(..., examples=["admin@qyka.com"])
    password: str = Field(..., min_length=1, examples=["hunter2"])


# Same floor for a temporary password and a chosen one.
_MIN_PASSWORD = 8


class AdminCreateIn(BaseModel):
    email: str = Field(..., examples=["ops@qyka.com"])
    full_name: str | None = Field(None, max_length=120)
    temporary_password: str = Field(..., min_length=_MIN_PASSWORD)


class AdminPasswordChangeIn(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=_MIN_PASSWORD)


class RiderStatusIn(BaseModel):
    status: RiderStatus
