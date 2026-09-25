import hashlib
import hmac
import json
import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import UserRole
from app.core.security import get_current_user, get_customer_user, require_role
from app.payments import service
from app.payments.schemas import CheckoutOut

router = APIRouter()


@router.post("/orders/{order_id}/checkout", response_model=CheckoutOut)
async def checkout(
    order_id: uuid.UUID,
    body: dict = {},
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> CheckoutOut:
    data = await service.start_checkout(
        db, order_id=order_id, customer=customer, origin=body.get("origin"),
    )
    return CheckoutOut(**data)


@router.post("/orders/{order_id}/checkout/verify")
async def verify_checkout(
    order_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Called when the customer returns from Paystack checkout, to reconcile
    immediately instead of waiting on a webhook that may never reach us."""
    return await service.verify_checkout(
        db, customer=customer, order_id=order_id, reference=body.get("reference", ""),
    )


@router.post("/webhook")
async def paystack_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
) -> Response:
    """Paystack calls this on payment events.

    We verify the signature (HMAC-SHA512 of the raw body with our secret key)
    before trusting anything. An unsigned or mis-signed call is rejected.
    """
    raw = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(
        settings.paystack_secret_key.encode(), raw, hashlib.sha512
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return Response(status_code=status.HTTP_401_UNAUTHORIZED)

    event = json.loads(raw or b"{}")
    if event.get("event") == "charge.success":
        reference = event.get("data", {}).get("reference")
        if reference:
            # Route by reference prefix: 'fund_' is a wallet top-up, otherwise
            # it's an order payment.
            if reference.startswith("fund_"):
                await service.confirm_funding_payment(db, reference)
            elif reference.startswith("deposit_"):
                await service.confirm_deposit_payment(db, reference)
            else:
                await service.confirm_payment(db, reference)

    # Always 200 once verified, so Paystack stops retrying.
    return Response(status_code=status.HTTP_200_OK)


@router.post("/expire-stale")
async def expire_stale(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict[str, int]:
    """Manually trigger auto-cancel of lapsed unpaid orders (also run on cron)."""
    count = await service.expire_stale_orders(db)
    return {"cancelled": count}


@router.post("/orders/{order_id}/pay-from-wallet")
async def pay_from_wallet(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Pay from wallet balance — a peer option to paying by bank."""
    return await service.pay_from_wallet(db, order_id=order_id, customer=customer)


@router.post("/wallet/fund/init")
async def init_wallet_funding(
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_customer_user),
) -> dict:
    """Start a Paystack top-up. Wallet credited only when the webhook confirms."""
    from decimal import Decimal
    amount = Decimal(str(body.get("amount", "0")))
    return await service.init_wallet_funding(
        db, customer=customer, amount=amount, origin=body.get("origin"),
    )


@router.post("/wallet/fund/verify")
async def verify_wallet_funding(
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Called when the customer returns from Paystack checkout, to reconcile
    immediately instead of waiting on a webhook that may never reach us."""
    return await service.verify_wallet_funding(
        db, customer=customer, reference=body.get("reference", ""),
    )


@router.post("/orders/{order_id}/deposit/pay-from-wallet")
async def pay_deposit_from_wallet(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Pay the up-front deposit from wallet balance."""
    return await service.pay_deposit_from_wallet(db, order_id=order_id, customer=customer)


@router.post("/orders/{order_id}/deposit/checkout")
async def deposit_checkout(
    order_id: uuid.UUID,
    body: dict = {},
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Start a Paystack payment for the deposit (bank option)."""
    return await service.init_deposit_checkout(
        db, order_id=order_id, customer=customer, origin=body.get("origin"),
    )


@router.post("/orders/{order_id}/deposit/checkout/verify")
async def verify_deposit_checkout(
    order_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    customer: User = Depends(get_current_user),
) -> dict:
    """Called when the customer returns from Paystack deposit checkout, to
    reconcile immediately instead of waiting on a webhook that may never
    reach us."""
    return await service.verify_deposit_checkout(
        db, customer=customer, order_id=order_id, reference=body.get("reference", ""),
    )
