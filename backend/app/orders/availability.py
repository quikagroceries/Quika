"""Item-not-available flow.

When an agent can't find a listed item at the stall, they flag it unavailable;
the customer is pinged to decide: buy it elsewhere, or drop it. If the customer
never answers, finish_shopping falls back to buying it "as listed" — at the
customer's stated price — so the order isn't blocked on an unresponsive customer.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications import service as notif_service
from app.orders.models import Order, OrderItem


async def flag_unavailable(
    db: AsyncSession, *, order: Order, agent_id: uuid.UUID, item_id: uuid.UUID
) -> OrderItem:
    """Agent marks an item not found; customer is pinged to decide."""
    if order.agent_id != agent_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    item = next((it for it in order.items if it.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not on this order")
    item.availability = "unavailable"
    await notif_service.send(
        db, user_id=order.customer_id, order_id=order.id,
        kind="item_unavailable",
        message=f"'{item.description}' isn't available here. Buy it elsewhere, "
                f"or drop it? If you don't respond, we'll buy it as listed.",
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
    """Customer chooses 'buy_elsewhere' or 'dropped' for an unavailable item."""
    if order.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if decision not in ("buy_elsewhere", "dropped"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid decision")
    item = next((it for it in order.items if it.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not on this order")
    if item.availability != "unavailable":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Item is not awaiting a decision"
        )
    item.availability = decision
    # order.agent_id is guaranteed set here: only an assigned agent can flag
    # an item unavailable in the first place (see flag_unavailable above).
    await notif_service.send(
        db, user_id=order.agent_id, order_id=order.id,
        kind="item_decided",
        message=f"Customer decided: {decision.replace('_', ' ')} — '{item.description}'.",
    )
    await db.flush()
    return item


def resolve_unanswered(order: Order) -> list[OrderItem]:
    """At shopping's end, any still-'unavailable' item falls back to buy-as-listed.

    Returns the items the agent should now buy at their listed price. Called by
    finish_shopping so an unresponsive customer never blocks the order.
    """
    fallback = []
    for it in order.items:
        if it.availability == "unavailable":
            # Customer never answered → buy as listed.
            it.availability = "buy_elsewhere"
            fallback.append(it)
    return fallback
