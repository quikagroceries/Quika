import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class MessageIn(BaseModel):
    text: str | None = None
    image_url: str | None = None

    @model_validator(mode="after")
    def _require_something(self) -> "MessageIn":
        if not self.text and not self.image_url:
            raise ValueError("Message must have text or image_url")
        return self


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    sender_id: uuid.UUID
    text: str | None
    image_url: str | None
    created_at: datetime


class ConversationPartyOut(BaseModel):
    id: uuid.UUID
    full_name: str | None
    avatar_url: str | None = None


class ConversationLastMessageOut(BaseModel):
    text: str | None
    has_image: bool
    sender_id: uuid.UUID
    created_at: datetime


class ConversationOut(BaseModel):
    """One row of the messages inbox: an order's chat, from the point of view
    of whoever is asking (`other` is the person on the other end)."""

    order_id: uuid.UUID
    order_status: str
    market_name: str | None
    other: ConversationPartyOut | None
    last_message: ConversationLastMessageOut
    unread: int
