import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Float,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import OrderStatus


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True
    )
    # ONLY ever set once the customer accepts a proposal (or an admin
    # manually assigns) - see proposed_agent_id below for the pre-acceptance
    # candidate. Every other part of the app that gates on "is this agent
    # on this order" (chat, /orders/mine, JIT, delivery) keys off THIS field
    # specifically, which is exactly what keeps a proposed-but-not-yet-
    # accepted agent from seeing or touching the order at all.
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    # The agent currently proposed, pending the customer's accept / see
    # another - set while status is PROPOSED, cleared the moment it resolves
    # either way (accepted -> becomes agent_id; none left -> back to DRAFT).
    proposed_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    # Every agent the customer has tapped "see another" past, for THIS
    # order - the exclude-list so re-proposing never repeats one they
    # already turned down. A JSON array of agent user-ids (not FK-enforced,
    # same loose-reference convention as agent_id itself).
    rejected_agent_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Stamped every time agent_id is set (initial auto-assign, admin assign,
    # or re-assign after a release) - the customer-facing status timeline's
    # "Agent assigned" step. Always earlier than paid_at: an agent must be
    # assigned before shopping (and therefore payment) can happen at all.
    agent_assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    market_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.DRAFT, index=True
    )

    # Fees, computed once shopping completes. Money is ALWAYS Numeric/Decimal.
    items_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    # Combined agent/commission fee (single customer-facing line) and its split.
    combined_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    company_share: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    agent_share: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    # Pass-through costs the customer covers on their own lines.
    emtl_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    transfer_fees_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    grand_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )

    # Risk model: the payment gate. Nothing dispatches until paid, and the
    # window closes at this timestamp -> auto-cancel if unpaid.
    payment_window_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Stamped exactly once, the moment the order first reaches PAID (wallet
    # or confirmed Paystack webhook - see payments.service). Drives the
    # agent's earnings-by-day dashboard; distinct from created_at, which can
    # be days earlier than when the customer actually paid.
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Agent fee is time-based, so we stamp when shopping actually began.
    shopping_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Pre-shopping estimate: the only total that exists before bargaining.
    # Drives the deposit threshold check. Combined (goods + delivery + fee) -
    # NOT what the spending authorization cap should be (see goods_estimate).
    estimated_value: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    # Goods-only portion of the pre-shopping estimate (listed_items_total at
    # creation, before delivery/fee are added). This - never estimated_value
    # - is what the agent's spending authorization cap is set from: the
    # authorization exists to bound vendor spending (goods), and delivery/fee
    # are never paid through it, so including them in the cap would let an
    # agent overspend real goods money by roughly a delivery-quote's worth.
    goods_estimate: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )

    # Deposit taken up front on orders past the threshold. This is PARTIAL
    # PAYMENT, not a held sum — it counts toward the final bill.
    deposit_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    deposit_paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Where the courier delivers to. Captured now; used for courier quotes
    # once Kwik/Sendbox are integrated.
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Packing photos (proof the full order was assembled and handed to courier).
    # A JSON array of storage refs — never the bytes. Uploads must NEVER block
    # the money or the handover; they attach best-effort.
    packing_photos: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Drop-off coordinates for courier quotes. From a map pin or geocoding.
    dropoff_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    dropoff_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Tracking reference from the courier partner, set at dispatch. Free text
    # (V1 placeholder - a real Kwik/Sendbox integration would set this from
    # their booking response) so there's somewhere for tracking data to live
    # even before that integration exists. rider_id above predates the
    # third-party-courier model and is unused; this is deliberately separate
    # rather than repurposing it.
    courier_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Short PIN shown to the customer, given to the rider at handover - a
    # verifiable-handoff step, not a hard gate (there's no rider-side app in
    # this system yet to check it against). Generated at dispatch, alongside
    # courier_reference.
    handover_code: Mapped[str | None] = mapped_column(String(8), nullable=True)

    # Status-timeline timestamps (packed/dispatched/delivered) - each stamped
    # exactly once, at the matching transition in delivery.service. Together
    # with created_at/agent_assigned_at/paid_at above, these back the
    # customer's post-payment status feed end to end.
    packed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dispatched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id"), index=True
    )

    # DELIBERATELY free text. There is no product catalogue — the moment this
    # becomes a FK to a products table, Qyka is a supermarket app.
    description: Mapped[str] = mapped_column(Text)
    requested_note: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # e.g. "Mama Chidinma's stall, ripe ones"
    # Display-only quantity from the detailed list builder (e.g. "3" bags of
    # rice). listed_price already holds that row's full amount (price x qty),
    # so this never factors into any total - it's shown alongside the
    # description, nothing more.
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # What the customer stated they'd pay (their listed price), so the
    # "buy as listed" fallback has a target when the customer doesn't answer.
    listed_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # A strong HINT, not a binding order — set only when the customer added
    # this item while browsing a specific stall's page (jit.models.Seller).
    # The agent tries to buy it there first, but a pinned stall can always be
    # closed/sold-out/gone that day; when that happens it's routed through
    # the SAME unavailable-item flow below, not a separate mechanism. No FK
    # constraint - loose reference, same convention as Seller.market_id.
    preferred_stall_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # Not-available flow. When the agent can't find an item at the stall they
    # flag it 'unavailable'; the customer decides buy_elsewhere or drop; if they
    # never answer, it falls back to buy-as-listed at shopping's end. A pinned
    # vendor being closed/out-of-stock/gone goes through this exact same flow -
    # "vendor unavailable" is not a distinct case from "item unavailable".
    #   pending | unavailable | buy_elsewhere | dropped | bought
    availability: Mapped[str] = mapped_column(String(20), default="pending")

    confirmed_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Which stall purchase (jit.models.VendorTransfer) this item's price was
    # confirmed by - set alongside confirmed_price in jit.service.pay_vendor.
    # Lets the customer-facing checklist show the actual purchase photo next
    # to each item, not just a flat list of receipts with no connection to
    # what they bought. No FK constraint (VendorTransfer lives in a different
    # module/table set already reached from either side by order_id) - just
    # an id reference, same pattern as agent_id/customer_id elsewhere here.
    vendor_transfer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Per-item overage flow (#5): set when the agent finds this item's REAL
    # price above listed_price and requests approval for just this item,
    # rather than the whole order's spending cap (that's a separate,
    # aggregate-level concern in jit.service). overage_decision is None while
    # pending, "approved" (agent may now buy it, normally via pay-vendor) or
    # "declined" (skipped - see orders.overage.resolve_unanswered for the
    # same outcome when the customer never answers at all).
    overage_requested_price: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    overage_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    overage_decision: Mapped[str | None] = mapped_column(String(20), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")
