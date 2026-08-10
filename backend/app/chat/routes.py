import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.chat import service
from app.chat.schemas import MessageIn, MessageOut
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


@router.post("/{order_id}/messages", response_model=MessageOut, status_code=201)
async def post_message(
    order_id: uuid.UUID,
    body: MessageIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageOut:
    return await service.send_message(
        db, order_id=order_id, sender_id=user.id,
        text=body.text, image_url=body.image_url,
    )


@router.get("/{order_id}/messages", response_model=list[MessageOut])
async def get_messages(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MessageOut]:
    return await service.list_messages(db, order_id=order_id, user_id=user.id)
