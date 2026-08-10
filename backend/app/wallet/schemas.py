import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class WalletOut(BaseModel):
    balance: Decimal


class FundWalletIn(BaseModel):
    amount: Decimal = Field(..., gt=0, examples=["5000.00"])


class LedgerEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID | None
    direction: str
    amount: Decimal
    balance_after: Decimal
    note: str | None
    created_at: datetime
