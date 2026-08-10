"""Delivery service — packing, rider assignment, dispatch, confirmation, payout.

Guards mirror the rest of the system: transitions go through the state machine,
and each action checks the actor is allowed. The important boundary is that
NONE of this is reachable until an order is PAID — the state machine enforces
that, so an unpaid order can never be packed or dispatched.

Delivery confirmation is the terminal money event: it computes the payout split
and releases the agent's and rider's shares from the float pool.
"""

import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import User
from app.core.enums import LedgerDirection, OrderStatus, UserRole
from app.delivery import payouts
from app.float import service as float_service
from app.orders.models import Order
from app.orders.state_machine import IllegalTransition, assert_can_transition
from app.payments.models import Transaction


async def _load(db: AsyncSession, order_id: uuid.UUID) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


async def _transition(db: AsyncSession, order: Order, target: OrderStatus) -> None:
    try:
        assert_can_transition(order.status, target)
    except IllegalTransition as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    order.status = target
    await db.flush()


async def mark_packed(
    db: AsyncSession, *, order_id: uuid.UUID, agent_id: uuid.UUID
) -> Order:
    """Agent packs the order. Only valid once PAID (state machine enforces)."""
    order = await _load(db, order_id)
    if order.agent_id != agent_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    await _transition(db, order, OrderStatus.PACKED)
    order.packed_at = datetime.now(timezone.utc)
    await db.flush()
    return order


async def dispatch_to_courier(
    db: AsyncSession, *, order_id: uuid.UUID, actor: User, courier_reference: str | None = None
) -> Order:
    """Hand a packed order to the third-party courier (Kwik / Sendbox).

    Quika does not employ riders. The courier is only alerted AFTER payment,
    so nobody travels for an order that might not be paid for — and the goods
    are already packed when they arrive, so there is no paid waiting time.

    Callable by the assigned agent (the one actually handing the package
    over, right after packing it - see delivery.routes) or an admin
    (oversight override, no ownership check). V1 records the handoff and
    moves the order out for delivery, generating a placeholder tracking
    reference if the caller doesn't supply one, so there's always something
    for a tracking screen to show. The partner's booking API call goes here
    once a courier partnership is live; courier_reference would then come
    from its response instead of being generated.
    """
    order = await _load(db, order_id)
    if order.status is not OrderStatus.PACKED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Order must be packed before courier dispatch",
        )
    if actor.role is not UserRole.ADMIN and order.agent_id != actor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    order.courier_reference = courier_reference or f"QK-{order.id.hex[:8].upper()}"
    # A short PIN the customer shares with the rider at handover - a
    # verifiable-handoff step. secrets, not random, since it's shared as a
    # (light) proof-of-identity even though nothing here checks it against a
    # rider-side app yet.
    order.handover_code = f"{secrets.randbelow(10_000):04d}"
    order.dispatched_at = datetime.now(timezone.utc)
    await _transition(db, order, OrderStatus.OUT_FOR_DELIVERY)
    return order


async def confirm_delivery(
    db: AsyncSession, *, order_id: uuid.UUID, customer_id: uuid.UUID
) -> dict:
    """Customer confirms receipt. Terminal money event: release payouts.

    The agent fee and rider fee are debited OUT of the float pool to them; the
    company retains item-cost recovery + service charge. The split is recorded
    on the order's transaction for audit.
    """
    order = await _load(db, order_id)
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")

    await _transition(db, order, OrderStatus.DELIVERED)
    order.delivered_at = datetime.now(timezone.utc)

    split = payouts.compute_split(order)

    # Release agent + rider shares from the pool.
    if order.agent_share > 0:
        await float_service.record_movement(
            db,
            direction=LedgerDirection.DEBIT,
            amount=order.agent_share,
            order_id=order.id,
            market_id=order.market_id,
            note="Agent payout",
        )
    if order.delivery_fee > 0:
        await float_service.record_movement(
            db,
            direction=LedgerDirection.DEBIT,
            amount=order.delivery_fee,
            order_id=order.id,
            market_id=order.market_id,
            note="Courier delivery cost",
        )

    # Record the split on the transaction for audit.
    result = await db.execute(
        select(Transaction).where(Transaction.order_id == order.id)
    )
    txn = result.scalars().first()
    if txn is not None:
        txn.split_breakdown = split

    await _transition(db, order, OrderStatus.CLOSED)
    return split
