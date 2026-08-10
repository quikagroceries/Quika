import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.enums import TransactionStatus


class CheckoutOut(BaseModel):
    """Returned when a customer starts payment — hand these to the frontend."""

    authorization_url: str | None
    reference: str
    amount: Decimal


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    paystack_reference: str | None
    amount: Decimal
    status: TransactionStatus
