import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import OrderStatus


class OrderItemIn(BaseModel):
    description: str = Field(..., examples=["500 naira pepper"])
    requested_note: str | None = Field(
        default=None, examples=["Mama Chidinma's stall, ripe ones"]
    )
    # What the customer expects to pay for THIS item. Optional - items with no
    # listed_price are "budget" items; their share of the goods total comes
    # instead from CreateOrderIn.listed_items_total. See create_order in
    # service.py for how the two combine.
    listed_price: Decimal | None = Field(default=None, ge=0, examples=["500.00"])
    # Display-only (see OrderItem.quantity) — never factored into totals.
    quantity: int | None = Field(default=None, ge=1, examples=[2])
    # A hint, not a guarantee — see OrderItem.preferred_stall_id. Set only
    # when the customer added this item from a specific stall's page.
    preferred_stall_id: uuid.UUID | None = Field(default=None)


class AddItemIn(BaseModel):
    """A single item added mid-shopping (see orders.service.add_item).

    Unlike OrderItemIn at order creation, listed_price is REQUIRED here, not
    optional - a mid-order addition has no "budget/unstructured" bucket to
    fall back into (that's only ever set once, at CreateOrderIn.listed_items_total),
    so an item added without a price would give the agent no extra spending
    room to actually buy it (see jit.raise_authorization, called with this
    exact amount).
    """

    description: str = Field(..., examples=["A bag of onions"])
    requested_note: str | None = Field(
        default=None, examples=["Mama Chidinma's stall, ripe ones"]
    )
    listed_price: Decimal = Field(..., gt=0, examples=["500.00"])
    quantity: int | None = Field(default=None, ge=1, examples=[2])
    preferred_stall_id: uuid.UUID | None = Field(default=None)


class CreateOrderIn(BaseModel):
    delivery_address: str | None = None
    # Where the customer dropped the delivery pin (optional - an address
    # alone still works). Used for courier quotes.
    dropoff_latitude: float | None = Field(default=None, ge=-90, le=90)
    dropoff_longitude: float | None = Field(default=None, ge=-180, le=180)
    # The customer's estimate for whichever items DON'T carry their own
    # listed_price (the budget/unstructured portion of the list) — added to
    # the sum of itemized prices, not overridden by them, so a list can freely
    # mix priced and un-priced items. Drives the deposit check.
    listed_items_total: Decimal = Decimal("0.00")
    market_id: uuid.UUID
    items: list[OrderItemIn] = Field(..., min_length=1)


class UpdateDraftIn(BaseModel):
    """Full replacement of a draft order's list - same shape as CreateOrderIn
    minus market (a draft's market is fixed)."""

    delivery_address: str | None = None
    listed_items_total: Decimal = Decimal("0.00")
    items: list[OrderItemIn] = Field(..., min_length=1)


class AssignAgentIn(BaseModel):
    # The agent's USER id (a user whose role is AGENT). Order.agent_id holds
    # this same user id, so item confirmation can match on the logged-in user.
    agent_id: uuid.UUID


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    requested_note: str | None
    listed_price: Decimal | None
    quantity: int | None
    preferred_stall_id: uuid.UUID | None
    availability: str
    confirmed_price: Decimal | None
    confirmed_at: datetime | None
    vendor_transfer_id: uuid.UUID | None
    overage_requested_price: Decimal | None
    overage_requested_at: datetime | None
    overage_decision: str | None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID
    agent_id: uuid.UUID | None
    proposed_agent_id: uuid.UUID | None
    market_id: uuid.UUID
    status: OrderStatus
    items_total: Decimal
    combined_fee: Decimal
    company_share: Decimal
    agent_share: Decimal
    delivery_fee: Decimal
    emtl_total: Decimal
    transfer_fees_total: Decimal
    grand_total: Decimal
    estimated_value: Decimal
    goods_estimate: Decimal
    deposit_amount: Decimal
    deposit_paid_at: datetime | None
    delivery_address: str | None
    payment_window_expires_at: datetime | None
    agent_assigned_at: datetime | None
    paid_at: datetime | None
    packed_at: datetime | None
    dispatched_at: datetime | None
    delivered_at: datetime | None
    courier_reference: str | None
    handover_code: str | None
    packing_photos: list[str] | None
    dropoff_latitude: float | None
    dropoff_longitude: float | None
    created_at: datetime
    items: list[OrderItemOut]


class ProposedAgentOut(BaseModel):
    """Just enough for the customer to recognize/accept the proposed agent -
    no general user-lookup endpoint exists in this app, this is scoped
    narrowly to the propose/accept flow."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None
    phone: str
    avatar_url: str | None = None


class AssignedAgentOut(BaseModel):
    """The customer-facing card for the agent shopping their order: name and
    photo only. Deliberately no phone number - contact goes through the
    order chat/call, and the customer never needed the raw number."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str | None
    avatar_url: str | None = None


class SeeAnotherOut(BaseModel):
    outcome: str  # "proposed" | "only_option" | "none"
    order: OrderOut


class BargainedItemOut(BaseModel):
    """One line of the bargained list the customer reviews before paying."""

    description: str
    requested_note: str | None
    price_paid: Decimal | None
    found: bool


class BargainedListOut(BaseModel):
    """What the customer sees after the agent finishes bargaining.

    Shows the real negotiated price of every item, what wasn't available, the
    fee breakdown, any deposit already paid, and the balance still owed.
    """

    order_id: uuid.UUID
    status: OrderStatus
    items: list[BargainedItemOut]
    items_total: Decimal
    combined_fee: Decimal
    delivery_fee: Decimal
    emtl_total: Decimal
    transfer_fees_total: Decimal
    grand_total: Decimal
    deposit_paid: Decimal
    amount_due: Decimal
