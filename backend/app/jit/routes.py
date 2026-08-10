import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, require_role
from app.jit import service
from app.jit.models import SpendingAuthorization
from app.jit.schemas import (
    AttachPhotoIn, AuthorizationOut, PayVendorIn, RaiseCapIn, VendorTransferOut,
)
from app.orders.service import _load, load_order_for_participant

router = APIRouter()


@router.get("/orders/{order_id}/purchases", response_model=list[VendorTransferOut])
async def list_purchases(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[VendorTransferOut]:
    """Purchase photos + amounts per stall - proof of goods bought. Same
    participant gate as chat: the order's customer or assigned agent only."""
    await load_order_for_participant(db, order_id, user.id)
    return await service.list_purchases(db, order_id=order_id)


@router.post("/orders/{order_id}/pay-vendor", response_model=VendorTransferOut)
async def pay_vendor(
    order_id: uuid.UUID,
    body: PayVendorIn,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> VendorTransferOut:
    """Agent pays a vendor. The transfer IS the price — no free-typed amounts."""
    order = await _load(db, order_id)
    transfer = await service.pay_vendor(
        db, order=order, agent_id=agent.id,
        account_number=body.account_number, bank_code=body.bank_code,
        items=[i.model_dump() for i in body.items],
        seller_id=body.seller_id, photo_ref=body.photo_ref,
    )
    return transfer


@router.post("/orders/{order_id}/purchases/{transfer_id}/photo", response_model=VendorTransferOut)
async def attach_photo(
    order_id: uuid.UUID,
    transfer_id: uuid.UUID,
    body: AttachPhotoIn,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role(UserRole.AGENT)),
) -> VendorTransferOut:
    """Attach (or replace) a purchase photo on an already-completed transfer -
    required before finish-shopping, but never blocks the payment itself."""
    order = await _load(db, order_id)
    return await service.attach_photo(
        db, order=order, agent_id=agent.id,
        transfer_id=transfer_id, photo_ref=body.photo_ref,
    )


@router.get("/orders/{order_id}/authorization", response_model=AuthorizationOut)
async def get_authorization(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SpendingAuthorization:
    result = await db.execute(
        select(SpendingAuthorization).where(
            SpendingAuthorization.order_id == order_id
        )
    )
    return result.scalar_one()


@router.post("/orders/{order_id}/authorization/raise", response_model=AuthorizationOut)
async def raise_cap(
    order_id: uuid.UUID,
    body: RaiseCapIn,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> SpendingAuthorization:
    """Customer approves an increase to the order's spending cap (overage / added item)."""
    order = await _load(db, order_id)
    if order.customer_id != customer.id:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    return await service.raise_authorization(db, order_id, body.extra)
