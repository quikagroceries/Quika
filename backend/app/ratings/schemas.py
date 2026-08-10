import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RateAgentIn(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class AgentRatingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    agent_id: uuid.UUID
    stars: int
    comment: str | None
    created_at: datetime
