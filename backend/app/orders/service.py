"""Order service — order lifecycle, item confirmation, and float wiring.

Everything that changes an order's state goes through the state machine guard.
Everything that moves money goes through the float service. Route handlers
call into here; they never touch the ledger or mutate status directly.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.enums import OrderStatus
from app.orders import fees
from app.orders.models import Order, OrderItem
from app.wallet import service as wallet_service
from app.orders import assignment
from app.notifications import service as notif_service
from app.markets.models import Agent
from app.orders.state_machine import IllegalTransition, assert_can_transition


async def _load(db: AsyncSession, order_id: uuid.UUID) -> Order:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


async def load_order_for_participant(
    db: AsyncSession, order_id: uuid.UUID, user_id: uuid.UUID
) -> Order:
    """Load an order, but only for the two people actually on it.

    Shared by anything scoped to "the customer or assigned agent of this
    order" rather than either role specifically - chat and the LiveKit call
    token endpoint both gate on this. An admin is deliberately NOT included:
    those surfaces are a private line between the two participants.
    """
    order = await _load(db, order_id)
    if user_id not in (order.customer_id, order.agent_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Not a participant on this order"
        )
    return order


async def _transition(db: AsyncSession, order: Order, target: OrderStatus) -> None:
    try:
        assert_can_transition(order.status, target)
    except IllegalTransition as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    order.status = target
    await db.flush()


async def create_order(
    db: AsyncSession,
    *,
    customer_id: uuid.UUID,
    market_id: uuid.UUID,
    items: list[dict],
    delivery_address: str | None = None,
    listed_items_total: Decimal = Decimal("0.00"),
    must_prepay: bool = False,
) -> Order:
    """Create the order and work out whether a deposit is required.

    listed_items_total is what the CUSTOMER expects the items WITHOUT their
    own listed_price to cost — i.e. only the unstructured/budget remainder.
    It's ADDED to the sum of real per-item listed_price values, never
    overridden by them, so a single order can freely mix priced ("detailed")
    items and un-priced ("budget") items and still get a correct combined
    total. Pure detailed: every item is priced, so this stays 0.00. Pure
    budget: no item is priced, so this IS the whole goods total (unchanged
    behavior from before mixed lists existed). Either way this figure drives
    both the deposit threshold (via estimated_value, which adds delivery +
    fee) and the JIT spending cap (see jit.service.get_or_create_authorization,
    which sets cap = order.goods_estimate - goods only, since delivery/fee
    are never paid through the authorization).
    """
    item_prices = [
        i["listed_price"] for i in items if i.get("listed_price") is not None
    ]
    priced_total = sum(item_prices, start=Decimal("0.00"))
    listed_items_total = priced_total + listed_items_total
    estimated_value = fees.estimate_order_value(listed_items_total)
    # A customer flagged must_prepay (a below-threshold non-payer) pays 100% up
    # front regardless of order size, until they complete a paid order. Read the
    # flag from their record so it can't be bypassed by the caller.
    from app.auth.models import User as _User
    cust = (
        await db.execute(select(_User).where(_User.id == customer_id))
    ).scalar_one_or_none()
    effective_prepay = must_prepay or bool(cust and cust.must_prepay)
    deposit = fees.required_deposit(
        listed_items_total, estimated_value, must_prepay=effective_prepay
    )

    order = Order(
        customer_id=customer_id,
        market_id=market_id,
        status=OrderStatus.DRAFT,
        delivery_address=delivery_address,
        estimated_value=estimated_value,
        goods_estimate=listed_items_total,
        deposit_amount=deposit,
    )
    order.items = [
        OrderItem(
            description=i["description"],
            requested_note=i.get("requested_note"),
            listed_price=i.get("listed_price"),
            quantity=i.get("quantity"),
        )
        for i in items
    ]
    db.add(order)
    await db.flush()
    await db.refresh(order, attribute_names=["items"])

    # --- Propose an available agent for this market (does NOT assign) ---
    # agent_id stays unset until the customer accepts - see accept_proposal.
    # The agent has no access to the order at all until that happens.
    agent = await assignment.find_available_agent(db, market_id)
    if agent is not None:
        order.proposed_agent_id = agent.user_id
        order.status = OrderStatus.PROPOSED
        await db.flush()
    # If none free, order stays DRAFT/unassigned; admin oversight surfaces it.

    return order


async def delete_order(
    db: AsyncSession, *, order_id: uuid.UUID, customer_id: uuid.UUID
) -> None:
    """Delete an order the customer placed but never got shopped.

    Only ever legal pre-shopping (draft, proposed, or agent_assigned) AND
    with no deposit collected. Status alone isn't a strong enough guard: a
    deposit can be paid on an agent_assigned order before shopping starts
    (see OrderDetail's deposit banner / payments.pay_deposit), so a
    pre-shopping order can still have real money attached to it. Once
    shopping starts (spending authorization opened) or a deposit is paid,
    this is no longer a harmless draft - it must go through the real
    cancel/refund paths instead. The assigned agent (if any) was never
    marked busy for a pre-shopping order - that only happens in
    start_shopping - so there's no availability flag to release here.
    """
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status not in (OrderStatus.DRAFT, OrderStatus.PROPOSED, OrderStatus.AGENT_ASSIGNED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Can only delete an order before shopping has started",
        )
    if order.deposit_paid_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot delete an order with a deposit already paid",
        )
    await db.delete(order)
    await db.flush()


async def cancel_order(
    db: AsyncSession, *, order_id: uuid.UUID, customer_id: uuid.UUID
) -> Order:
    """Customer cancels before shopping starts - the real cancel/refund path
    delete_order's docstring points to for an order that already has a
    deposit on it. Same pre-shopping window as delete_order (draft,
    proposed, or agent_assigned only; once SHOPPING has opened a spending
    authorization the agent is committed and this is no longer available -
    a lapsed payment after that point is must_prepay/loss territory instead,
    see payments.service.expire_stale_orders).

    Unlike delete_order, a paid deposit does NOT block this - it's refunded
    to the wallet instead, mirroring finish_shopping's nothing-found refund
    exactly (same wallet_service.credit call, same "only refund a deposit
    that was ACTUALLY collected" guard). The order row is kept (status
    CANCELLED), not deleted, since real money already moved on it.
    """
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status not in (OrderStatus.DRAFT, OrderStatus.PROPOSED, OrderStatus.AGENT_ASSIGNED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Can only cancel an order before shopping has started",
        )
    if order.deposit_amount > 0 and order.deposit_paid_at is not None:
        await wallet_service.credit(
            db,
            order.customer_id,
            order.deposit_amount,
            order_id=order.id,
            note="Deposit refund - order cancelled before shopping",
        )
    await _transition(db, order, OrderStatus.CANCELLED)
    return order


async def assign_agent(
    db: AsyncSession, *, order_id: uuid.UUID, agent_id: uuid.UUID
) -> Order:
    order = await _load(db, order_id)
    await _transition(db, order, OrderStatus.AGENT_ASSIGNED)
    order.agent_id = agent_id
    order.agent_assigned_at = datetime.now(timezone.utc)
    await db.flush()
    return order


async def release_order(
    db: AsyncSession, *, order_id: uuid.UUID, agent_id: uuid.UUID
) -> Order:
    """An agent releases an order before shopping starts, sending it back to
    the assignment pool - the agent-side analog of a customer deleting a
    draft. Only legal pre-shopping: once start_shopping has opened a spending
    authorization the agent is committed. Immediately retries proposing a
    new agent (same propose flow as order creation - the customer still gets
    to accept/see-another, this doesn't hard-reassign) so the order doesn't
    sit unassigned when another agent for the market is free; if none are,
    it just stays draft for admin oversight, same as an order created with
    no agent available.
    """
    order = await _load(db, order_id)
    if order.agent_id != agent_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Not the assigned agent for this order"
        )
    if order.status is not OrderStatus.AGENT_ASSIGNED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Can only release an order before shopping has started",
        )
    order.agent_id = None
    await _transition(db, order, OrderStatus.DRAFT)

    new_agent = await assignment.find_available_agent(db, order.market_id)
    if new_agent is not None:
        order.proposed_agent_id = new_agent.user_id
        await _transition(db, order, OrderStatus.PROPOSED)
    return order


async def accept_proposal(
    db: AsyncSession, *, order_id: uuid.UUID, customer_id: uuid.UUID
) -> Order:
    """Customer accepts the currently proposed agent - the ONLY way an order
    moves from PROPOSED to AGENT_ASSIGNED (besides an admin's manual
    override). This is the moment the agent actually gains access to the
    order at all.
    """
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status is not OrderStatus.PROPOSED or order.proposed_agent_id is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This order has no pending agent proposal"
        )
    order.agent_id = order.proposed_agent_id
    order.proposed_agent_id = None
    order.agent_assigned_at = datetime.now(timezone.utc)
    await _transition(db, order, OrderStatus.AGENT_ASSIGNED)
    return order


async def see_another(
    db: AsyncSession, *, order_id: uuid.UUID, customer_id: uuid.UUID
) -> dict:
    """Customer turns down the currently proposed agent and asks for a
    different one. Re-runs assignment excluding every agent already turned
    down for this order (including the one being rejected right now).

    Three outcomes:
      - "proposed": a genuinely different agent was found and is now proposed.
      - "only_option": nobody else is available - the SAME agent is still
        the only candidate, so they're re-proposed rather than left with
        nothing. rejected_agent_ids is NOT updated in this case (there's
        nothing to gain by permanently excluding the only agent who covers
        this market).
      - "none": no agent is available at all (not even the one just
        rejected, e.g. they went off-duty in the meantime) - the order
        drops back to DRAFT for admin oversight, same as an order created
        with nobody free.
    """
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status is not OrderStatus.PROPOSED or order.proposed_agent_id is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This order has no pending agent proposal"
        )

    # rejected_agent_ids is a JSON column - stored as strings (UUID objects
    # aren't JSON-serializable), converted back to UUID for the SQL exclude.
    already_rejected = [uuid.UUID(x) for x in (order.rejected_agent_ids or [])]
    rejecting_now = already_rejected + [order.proposed_agent_id]

    next_agent = await assignment.find_available_agent(
        db, order.market_id, exclude_ids=rejecting_now
    )
    if next_agent is not None:
        order.rejected_agent_ids = [str(x) for x in rejecting_now]
        order.proposed_agent_id = next_agent.user_id
        await db.flush()
        return {"outcome": "proposed", "order": order}

    # No genuinely different candidate. If this is the customer's FIRST
    # rejection attempt for this order (nobody rejected yet) and the
    # current agent is still legitimately available, they're the only
    # agent in the whole market - re-propose rather than reject into a
    # void. Once the customer has already been given at least one
    # replacement before, further exhaustion is reported as "none" rather
    # than endlessly re-offering whoever's left standing.
    if not already_rejected:
        still_only_one = await assignment.find_available_agent(
            db, order.market_id, exclude_ids=already_rejected
        )
        if still_only_one is not None:
            await db.flush()
            return {"outcome": "only_option", "order": order}

    order.proposed_agent_id = None
    order.rejected_agent_ids = [str(x) for x in rejecting_now]
    await _transition(db, order, OrderStatus.DRAFT)
    return {"outcome": "none", "order": order}


async def start_shopping(
    db: AsyncSession, *, order_id: uuid.UUID, agent_id: uuid.UUID
) -> Order:
    order = await _load(db, order_id)
    if order.agent_id != agent_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Not the assigned agent for this order"
        )
    # THE DEPOSIT GATE: if this order required a deposit, it must be paid before
    # any company money is spent shopping. This is the fix for the leak where
    # the deposit was deducted from the bill but never actually collected.
    if order.deposit_amount > 0 and order.deposit_paid_at is None:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Deposit must be paid before shopping can start",
        )
    # The agent fee is time-based, so the clock starts here.
    order.shopping_started_at = datetime.now(timezone.utc)
    # Open the spending authorization (cap = goods estimate).
    from app.jit import service as jit_service
    await jit_service.get_or_create_authorization(db, order)
    await assignment.set_agent_availability(db, agent_id, available=False)
    await _transition(db, order, OrderStatus.SHOPPING)
    return order


async def finish_shopping(
    db: AsyncSession, *, order_id: uuid.UUID, agent_id: uuid.UUID
) -> Order:
    """Close shopping, compute fees, open the payment window."""
    order = await _load(db, order_id)
    if order.agent_id != agent_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Not the assigned agent for this order"
        )

    # Any item still flagged 'unavailable' means the customer never answered —
    # fall back to buy-as-listed so an unresponsive customer doesn't block us.
    from app.orders import availability as _availability
    from app.orders import overage as _overage
    _availability.resolve_unanswered(order)
    _overage.resolve_unanswered(order)

    confirmed = [it for it in order.items if it.confirmed_price is not None]

    # --- Refund case B: nothing found in the whole market ---
    # The agent found none of the listed items. Any deposit is refunded in
    # full to the customer's wallet and the order is cancelled.
    if not confirmed:
        # Only refund a deposit that was ACTUALLY collected (deposit_paid_at set).
        # This closes the leak where an uncollected deposit could be "refunded"
        # as real money into the customer's wallet.
        if order.deposit_amount > 0 and order.deposit_paid_at is not None:
            await wallet_service.credit(
                db,
                order.customer_id,
                order.deposit_amount,
                order_id=order.id,
                note="Full deposit refund - no items available",
            )
        await assignment.set_agent_availability(db, agent_id, available=True)
        await notif_service.send(
            db, user_id=order.customer_id, order_id=order.id,
            kind="order_cancelled",
            message="None of your items were available. Your deposit has been refunded to your wallet.",
        )
        await _transition(db, order, OrderStatus.CANCELLED)
        return order

    items_total = sum(
        (it.confirmed_price for it in confirmed), start=Decimal("0.00")
    )

    # Agent fee is time-based: measure from when shopping actually started.
    shopping_seconds = 0.0
    if order.shopping_started_at is not None:
        started = order.shopping_started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        shopping_seconds = (
            datetime.now(timezone.utc) - started
        ).total_seconds()

    # EMTL: ₦50 per confirmed item transfer >= ₦10,000. Once the JIT transfer
    # layer is live these come from actual vendor_transfers; for now they're
    # derived from confirmed item prices, which is the same set of payments.
    emtl_total = sum(
        (fees.emtl_for_transfer(it.confirmed_price) for it in confirmed),
        start=Decimal("0.00"),
    )
    breakdown = fees.calculate_fees(
        items_total,
        shopping_seconds,
        emtl_total=emtl_total,
        transfer_fees_total=order.transfer_fees_total,
        delivery_fee=order.delivery_fee if order.delivery_fee else None,
    )
    order.items_total = breakdown["items_total"]
    order.combined_fee = breakdown["combined_fee"]
    order.company_share = breakdown["company_share"]
    order.agent_share = breakdown["agent_share"]
    order.delivery_fee = breakdown["delivery_fee"]
    order.emtl_total = breakdown["emtl_total"]
    order.grand_total = breakdown["grand_total"]

    # --- Refund case A: partial shortfall ---
    # Items were unavailable and the real total came in BELOW the deposit
    # already taken. The difference goes back to the customer's wallet.
    collected_deposit = (
        order.deposit_amount if order.deposit_paid_at is not None else Decimal("0.00")
    )
    if collected_deposit > order.grand_total:
        difference = collected_deposit - order.grand_total
        await wallet_service.credit(
            db,
            order.customer_id,
            difference,
            order_id=order.id,
            note="Partial deposit refund - final total below deposit",
        )
        order.deposit_amount = order.grand_total

    order.payment_window_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.payment_window_minutes
    )

    await assignment.set_agent_availability(db, agent_id, available=True)
    collected = order.deposit_amount if order.deposit_paid_at is not None else Decimal("0.00")
    amount_due = order.grand_total - collected
    await notif_service.send(
        db, user_id=order.customer_id, order_id=order.id,
        kind="payment_due",
        message=f"Shopping done. Your total is N{order.grand_total}. "
                f"Amount due now: N{amount_due if amount_due > 0 else 0}. "
                f"Review your bargained list and pay to start delivery.",
    )
    await _transition(db, order, OrderStatus.AWAITING_PAYMENT)
    return order


async def get_order(db: AsyncSession, order_id: uuid.UUID) -> Order:
    return await _load(db, order_id)


async def get_proposed_agent(db: AsyncSession, order_id: uuid.UUID):
    """Display info (name, phone) for the currently proposed agent, so the
    customer can actually see who they're being asked to accept - no
    general user-lookup endpoint exists in this app, this is scoped
    narrowly to the one case that needs it."""
    from app.auth.models import User

    order = await _load(db, order_id)
    if order.status is not OrderStatus.PROPOSED or order.proposed_agent_id is None:
        return None
    result = await db.execute(select(User).where(User.id == order.proposed_agent_id))
    return result.scalar_one_or_none()


async def list_orders_for_agent(db: AsyncSession, agent_id: uuid.UUID) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.agent_id == agent_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def list_orders_for_customer(
    db: AsyncSession, *, customer_id: uuid.UUID
) -> list[Order]:
    result = await db.execute(
        select(Order)
        .where(Order.customer_id == customer_id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def get_bargained_list(db: AsyncSession, order_id: uuid.UUID) -> dict:
    """The customer-facing view after bargaining: real prices, real total.

    amount_due subtracts any deposit already paid, so the customer sees
    exactly what's left to pay.
    """
    order = await _load(db, order_id)
    items = [
        {
            "description": it.description,
            "requested_note": it.requested_note,
            "price_paid": it.confirmed_price,
            "found": it.confirmed_price is not None,
        }
        for it in order.items
    ]
    collected = order.deposit_amount if order.deposit_paid_at is not None else Decimal("0.00")
    amount_due = order.grand_total - collected
    if amount_due < 0:
        amount_due = Decimal("0.00")
    return {
        "order_id": order.id,
        "status": order.status,
        "items": items,
        "items_total": order.items_total,
        "combined_fee": order.combined_fee,
        "delivery_fee": order.delivery_fee,
        "emtl_total": order.emtl_total,
        "transfer_fees_total": order.transfer_fees_total,
        "grand_total": order.grand_total,
        "deposit_paid": order.deposit_amount,
        "amount_due": amount_due,
    }
