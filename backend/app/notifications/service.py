"""Notification service — persist an in-app notice and (later) send SMS.

send() is the single entry point the rest of the app calls at trigger points
(shopping done, packaging running long, out for delivery). It always records
an in-app notification; SMS is a clearly-marked hook that switches on when an
SMS provider (Termii / Africa's Talking) key is configured.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.notifications.models import Notification


async def send(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    kind: str,
    message: str,
    order_id: uuid.UUID | None = None,
    phone: str | None = None,
) -> Notification:
    note = Notification(
        user_id=user_id, order_id=order_id, kind=kind, message=message
    )
    db.add(note)
    await db.flush()

    # --- SMS hook ---
    # When settings.sms_api_key is set, dispatch `message` to `phone` via the
    # provider here. Left as a no-op until the account exists so the flow works
    # end to end without SMS in development.
    if settings.sms_api_key and phone:
        pass  # await _send_sms(phone, message)

    return note
