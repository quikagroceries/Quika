import uuid

from pydantic import BaseModel


class PayoutOut(BaseModel):
    agent_payout: str
    courier_cost: str
    company_retained: str
    grand_total: str
