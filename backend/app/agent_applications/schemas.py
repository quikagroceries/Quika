import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ApplicationKind, ApplicationStatus


class ApplyAgentIn(BaseModel):
    market_id: uuid.UUID
    note: str | None = Field(
        default=None, examples=["I already run a stall at this market"]
    )


class PublicApplyIn(BaseModel):
    """From the public For Agents / For Riders pages - no account needed."""

    kind: ApplicationKind
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., examples=["08012345678"])
    # Agents: required (validated in service.apply_public). Riders: optional.
    market_id: uuid.UUID | None = None
    area: str | None = Field(default=None, max_length=200)
    vehicle: str | None = Field(default=None, max_length=60)
    note: str | None = Field(default=None, max_length=1000)


class AgentApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: ApplicationKind
    user_id: uuid.UUID | None
    full_name: str | None
    phone: str | None
    market_id: uuid.UUID | None
    area: str | None
    vehicle: str | None
    status: ApplicationStatus
    note: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime


class PublicApplyOut(BaseModel):
    """Deliberately minimal - the public caller gets no ids back."""

    detail: str
