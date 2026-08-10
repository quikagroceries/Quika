import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.security import get_current_user
from app.notifications.models import Notification
from app.notifications.schemas import NotificationOut

router = APIRouter()


@router.get("", response_model=list[NotificationOut])
async def my_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Notification:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    note = result.scalar_one()
    note.is_read = True
    await db.flush()
    return note
