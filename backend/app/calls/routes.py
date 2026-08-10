import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.calls import service
from app.core.database import get_db
from app.core.security import get_current_user
from app.orders.service import load_order_for_participant

router = APIRouter()


@router.post("/{order_id}/token")
async def get_call_token(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """A LiveKit token scoped to this order's room, for the order's
    customer or assigned agent only - same gating as chat."""
    await load_order_for_participant(db, order_id, user.id)
    return service.create_room_token(order_id=order_id, user=user)
