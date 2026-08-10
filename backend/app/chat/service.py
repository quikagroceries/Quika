"""Chat service — the private per-order line between customer and agent.

Both read and write are gated the same way: only the order's customer or its
assigned agent may see or post messages. Nobody else, including admins - see
orders.service.load_order_for_participant.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.models import Message
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
