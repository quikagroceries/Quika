import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.core.enums import OrderStatus


class SetAvailabilityIn(BaseModel):
    is_available: bool


class CompletedOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    market_id: uuid.UUID
    customer_id: uuid.UUID
    agent_share: Decimal
    grand_total: Decimal
    paid_at: datetime | None
    status: OrderStatus


class AgentSummaryOut(BaseModel):
    earnings_today: Decimal
    earnings_week: Decimal
    earnings_total: Decimal
    ready_to_shop_count: int
    in_progress_count: int
    is_available: bool
    on_duty: bool
    completed_orders: list[CompletedOrderOut]
