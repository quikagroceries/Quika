import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class TopUpIn(BaseModel):
    amount: Decimal = Field(..., gt=0, examples=["100000.00"])
    note: str | None = None


class PoolBalanceOut(BaseModel):
    balance: Decimal


class TransferIn(BaseModel):
    from_market_id: uuid.UUID
    to_market_id: uuid.UUID
    amount: Decimal = Field(..., gt=0, examples=["15000.00"])
    note: str | None = None
