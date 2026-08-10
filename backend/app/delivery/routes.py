import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, require_role
from app.delivery import service
from app.delivery.schemas import PayoutOut
from app.orders.schemas import OrderOut

router = APIRouter()


@router.post("/orders/{order_id}/pack", response_model=OrderOut)
async def pack(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> OrderOut:
    """Agent packs the paid order, ready for courier pickup."""
    return await service.mark_packed(db, order_id=order_id, agent_id=agent.id)


@router.post("/orders/{order_id}/dispatch-courier", response_model=OrderOut)
async def dispatch_courier(
    order_id: uuid.UUID,
    body: dict = {},
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_role(UserRole.AGENT, UserRole.ADMIN)),
) -> OrderOut:
    """Hand the packed order to the third-party courier.

    Only reachable once the order is PACKED, which requires PAID — so a
    courier is never dispatched for an unpaid order. Callable by the
    assigned agent (the normal path - one tap after packing) or an admin
    (oversight override); service.dispatch_to_courier enforces the agent
    ownership check.

    V1 records the handoff, generating a tracking reference if the caller
    doesn't supply one. The Kwik/Sendbox booking call slots in here: quote at
    order creation, book at this point, and pass its reference through
    instead of the generated placeholder.
    """
    return await service.dispatch_to_courier(
        db, order_id=order_id, actor=actor, courier_reference=body.get("courier_reference"),
    )


@router.post("/orders/{order_id}/confirm-delivery", response_model=PayoutOut)
async def confirm_delivery(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> PayoutOut:
    """Customer confirms receipt. Releases the agent payout."""
    split = await service.confirm_delivery(
        db, order_id=order_id, customer_id=customer.id
    )
    return PayoutOut(**split)


@router.post("/orders/{order_id}/packing-photos")
async def add_packing_photos(
    order_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> dict:
    """Attach packing photos (storage refs) to the order at handover.

    Best-effort: photos attach to the order but NEVER gate packing or dispatch,
    so a slow upload in a weak-signal market can't stall the handover. `refs`
    is a list of storage references (URLs/keys), never image bytes.
    """
    from app.orders.service import _load
    order = await _load(db, order_id)
    if order.agent_id != agent.id:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    refs = body.get("refs", [])
    existing = list(order.packing_photos or [])
    order.packing_photos = existing + [r for r in refs if r]
    await db.flush()
    return {"order_id": str(order.id), "packing_photos": order.packing_photos}
