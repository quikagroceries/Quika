"""Chat service — the private per-order line between customer and agent.

Both read and write are gated the same way: only the order's customer or its
assigned agent may see or post messages. Nobody else, including admins - see
orders.service.load_order_for_participant.
"""

import uuid

from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.chat.models import ChatRead, Message
from app.markets.models import Market
from app.orders.models import Order
from app.orders.service import load_order_for_participant


async def send_message(
    db: AsyncSession,
    *,
    order_id: uuid.UUID,
    sender_id: uuid.UUID,
    text: str | None,
    image_url: str | None,
) -> Message:
    await load_order_for_participant(db, order_id, sender_id)
    message = Message(
        order_id=order_id, sender_id=sender_id, text=text, image_url=image_url,
    )
    db.add(message)
    await db.flush()
    return message


async def list_messages(
    db: AsyncSession, *, order_id: uuid.UUID, user_id: uuid.UUID
) -> list[Message]:
    await load_order_for_participant(db, order_id, user_id)
    result = await db.execute(
        select(Message)
        .where(Message.order_id == order_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def mark_read(
    db: AsyncSession, *, order_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Record that this person has now seen everything in the order's chat."""
    await load_order_for_participant(db, order_id, user_id)
    now = datetime.now(timezone.utc)
    stmt = pg_insert(ChatRead).values(user_id=user_id, order_id=order_id, last_read_at=now)
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=[ChatRead.user_id, ChatRead.order_id],
            set_={"last_read_at": now},
        )
    )


async def list_conversations(db: AsyncSession, *, user_id: uuid.UUID) -> list[dict]:
    """The messages inbox: every order this person is on (as customer or as
    the assigned agent) that has at least one message, newest activity first,
    each with the other party, the last message, and how many of the other
    person's messages this user hasn't read yet."""
    orders = (
        await db.execute(
            select(Order).where(or_(Order.customer_id == user_id, Order.agent_id == user_id))
        )
    ).scalars().all()
    if not orders:
        return []
    by_id = {o.id: o for o in orders}
    ids = list(by_id)

    # Last message per order.
    last_at = (
        select(Message.order_id, func.max(Message.created_at).label("last_at"))
        .where(Message.order_id.in_(ids))
        .group_by(Message.order_id)
        .subquery()
    )
    last_rows = (
        await db.execute(
            select(Message).join(
                last_at,
                (Message.order_id == last_at.c.order_id) & (Message.created_at == last_at.c.last_at),
            )
        )
    ).scalars().all()
    last_by_order: dict[uuid.UUID, Message] = {}
    for m in last_rows:  # ties on created_at: keep whichever, they are simultaneous
        last_by_order.setdefault(m.order_id, m)
    if not last_by_order:
        return []

    # Unread = the other side's messages newer than my read marker.
    unread_rows = (
        await db.execute(
            select(Message.order_id, func.count())
            .outerjoin(
                ChatRead,
                (ChatRead.order_id == Message.order_id) & (ChatRead.user_id == user_id),
            )
            .where(
                Message.order_id.in_(list(last_by_order)),
                Message.sender_id != user_id,
                or_(ChatRead.last_read_at.is_(None), Message.created_at > ChatRead.last_read_at),
            )
            .group_by(Message.order_id)
        )
    ).all()
    unread = {oid: n for oid, n in unread_rows}

    # The person on the other end + the market's name.
    other_ids = {
        (o.agent_id if o.customer_id == user_id else o.customer_id)
        for o in (by_id[i] for i in last_by_order)
    } - {None}
    users = {
        u.id: u
        for u in (await db.execute(select(User).where(User.id.in_(other_ids)))).scalars().all()
    } if other_ids else {}
    markets = {
        m.id: m
        for m in (
            await db.execute(select(Market).where(Market.id.in_({by_id[i].market_id for i in last_by_order})))
        ).scalars().all()
    }

    out = []
    for oid, msg in last_by_order.items():
        order = by_id[oid]
        other_id = order.agent_id if order.customer_id == user_id else order.customer_id
        other = users.get(other_id)
        market = markets.get(order.market_id)
        out.append(
            {
                "order_id": oid,
                "order_status": order.status.value if hasattr(order.status, "value") else str(order.status),
                "market_name": market.name if market else None,
                "other": {"id": other.id, "full_name": other.full_name, "avatar_url": other.avatar_url} if other else None,
                "last_message": {
                    "text": msg.text,
                    "has_image": bool(msg.image_url),
                    "sender_id": msg.sender_id,
                    "created_at": msg.created_at,
                },
                "unread": unread.get(oid, 0),
            }
        )
    out.sort(key=lambda c: c["last_message"]["created_at"], reverse=True)
    return out
