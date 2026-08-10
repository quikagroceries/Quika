import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import ApplicationStatus


class ApplyAgentIn(BaseModel):
    market_id: uuid.UUID
    note: str | None = Field(
        default=None, examples=["I already run a stall at this market"]
    )


class AgentApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    market_id: uuid.UUID
    status: ApplicationStatus
    note: str | None
    reviewed_by: uuid.UUID | None
    reviewed_at: datetime | None
    created_at: datetime
