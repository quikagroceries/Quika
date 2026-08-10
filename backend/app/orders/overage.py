"""Per-item price-overage flow (#5): the agent found an item's REAL price
above what the customer stated (listed_price) at order creation. Rather than
silently overpaying, the agent requests approval for JUST that item; the
customer gets a notification and a persistent must-respond option on the
order. The agent keeps shopping other items while it's pending - unlike the
item-unavailable flow (see availability.py), an unanswered overage does NOT
fall back to buying it anyway: it's a request for MORE money than the
customer agreed to, so silence must never be read as approval. The item is
simply skipped (not bought).

Distinct from jit.service's spending-authorization overage: that one is the
whole order's aggregate cap; this is a single item's stated-vs-real price.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import OrderStatus
from app.notifications import service as notif_service
from app.orders.models import Order, OrderItem


async def request_overage(
    db: AsyncSession,
    *,
    order: Order,
    agent_id: uuid.UUID,
    item_id: uuid.UUID,
    price: Decimal,
) -> OrderItem:
    """Agent flags that an item's real price is over what the customer listed."""
    if order.agent_id != agent_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    if order.status is not OrderStatus.SHOPPING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Can only request an overage while shopping"
        )
    item = next((it for it in order.items if it.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not on this order")
    if item.confirmed_price is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Item is already bought")
    if item.listed_price is None or price <= item.listed_price:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This isn't an overage - pay it normally via pay-vendor",
        )
    item.overage_requested_price = price
    item.overage_requested_at = datetime.now(timezone.utc)
    item.overage_decision = None
    item.availability = "overage_pending"
    extra = price - item.listed_price
    await notif_service.send(
        db,
        user_id=order.customer_id,
        order_id=order.id,
        kind="item_overage",
        message=(
            f"'{item.description}' costs N{price} at the stall - N{extra} more "
            f"than the N{item.listed_price} you listed. Approve the extra cost? "
            f"You can hop on a call to confirm the price with the seller "
            f"directly. If you don't respond, we'll skip this item."
        ),
    )
    await db.flush()
    return item


async def customer_decide(
    db: AsyncSession,
    *,
    order: Order,
    customer_id: uuid.UUID,
    item_id: uuid.UUID,
    decision: str,
) -> OrderItem:
    """Customer approves or declines a pending per-item overage request."""
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if decision not in ("approved", "declined"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid decision")
    item = next((it for it in order.items if it.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not on this order")
    if item.availability != "overage_pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Item has no pending overage request"
        )
    item.overage_decision = decision
    item.availability = "pending" if decision == "approved" else "dropped"
    # order.agent_id is guaranteed set here: only an assigned agent can
    # request an overage in the first place (see request_overage above).
    await notif_service.send(
        db,
        user_id=order.agent_id,
        order_id=order.id,
        kind="item_overage_decided",
        message=(
            f"Customer approved the extra cost for '{item.description}' - go "
            f"ahead and buy it."
            if decision == "approved"
            else f"Customer declined the extra cost for '{item.description}' - skip it."
        ),
    )
    await db.flush()
    return item


def resolve_unanswered(order: Order) -> None:
    """At shopping's end, any still-pending overage is skipped (not bought) -
    no buy-anyway fallback, since this is a request for MORE money than the
    customer agreed to."""
    for it in order.items:
        if it.availability == "overage_pending":
            it.availability = "dropped"
