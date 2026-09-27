"""JIT service — the authorization + vendor-transfer engine.

This replaces "agent types a price." The agent REQUESTS a payment to a vendor
account; the system validates it against the order's spending authorization and
the safety caps, executes the transfer on the rail, and records it. The item's
confirmed price BECOMES the transferred amount — price and payment are one fact.

Kills structurally:
  - agent absconds with cash (no cash; money goes company -> vendor only)
  - price over-reporting (the price IS the transfer)
  - change skimming (exact amounts)

Idempotency: each attempt has a unique reference. On an unknown/failed result
the agent may retry; the service verifies with the rail before resending, so a
vendor is never double-paid.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import LedgerDirection, OrderStatus, TransactionStatus
from app.float import service as float_service
from app.jit.models import SpendingAuthorization, VendorAccount, VendorTransfer
from app.notifications import service as notif_service
from app.orders import fees
from app.orders.models import Order
from app.payments import transfers


async def list_purchases(
    db: AsyncSession, *, order_id: uuid.UUID
) -> list[VendorTransfer]:
    """Successful vendor transfers for an order - the receipts, including
    each stall's purchase photo (photo_ref). Proof of goods bought, for the
    order's customer or assigned agent to review."""
    result = await db.execute(
        select(VendorTransfer)
        .where(
            VendorTransfer.order_id == order_id,
            VendorTransfer.status == TransactionStatus.SUCCESS,
        )
        .order_by(VendorTransfer.created_at.asc())
    )
    return list(result.scalars().all())


async def purchases_missing_photos(
    db: AsyncSession, *, order_id: uuid.UUID
) -> list[VendorTransfer]:
    """Successful transfers with no proof-of-purchase photo attached yet.

    Backs the "required" half of the purchase-photo policy: the transfer
    itself is never blocked on a photo (see pay_vendor - photo_ref stays
    optional there, since a slow/failed upload in a weak-signal market must
    never hold up real money moving), but finish_shopping refuses to close
    out the order while any successful purchase is still missing one - the
    money moves immediately, the accountability catches up before the order
    can be considered done.
    """
    purchases = await list_purchases(db, order_id=order_id)
    return [t for t in purchases if not t.photo_ref]


async def attach_photo(
    db: AsyncSession,
    *,
    order: Order,
    agent_id: uuid.UUID,
    transfer_id: uuid.UUID,
    photo_ref: str,
) -> VendorTransfer:
    """Agent attaches (or replaces) a purchase photo on an already-completed
    transfer - the deferred half of the "required" photo policy. Never
    blocks anything by itself; finish_shopping is what actually enforces
    every purchase has one before the order can close out.
    """
    if order.agent_id != agent_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    result = await db.execute(
        select(VendorTransfer).where(
            VendorTransfer.id == transfer_id,
            VendorTransfer.order_id == order.id,
        )
    )
    transfer = result.scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Purchase not found on this order")
    transfer.photo_ref = photo_ref
    await db.flush()
    return transfer


async def get_or_create_authorization(
    db: AsyncSession, order: Order
) -> SpendingAuthorization:
    result = await db.execute(
        select(SpendingAuthorization).where(
            SpendingAuthorization.order_id == order.id
        )
    )
    auth = result.scalar_one_or_none()
    if auth is None:
        # Cap starts at the customer's GOODS estimate only - never
        # order.estimated_value, which also includes delivery + the combined
        # fee. Neither is ever paid through this authorization (delivery is
        # billed separately, the fee is deducted from the bill, not spent at
        # a vendor), so including them here would let an agent overspend
        # real goods money by roughly a delivery-quote's worth.
        auth = SpendingAuthorization(
            order_id=order.id,
            cap=order.goods_estimate,
            spent=Decimal("0.00"),
        )
        db.add(auth)
        await db.flush()
    return auth


async def raise_authorization(
    db: AsyncSession, order_id: uuid.UUID, extra: Decimal
) -> SpendingAuthorization:
    """Raise the cap by a customer-approved amount (overage or added item).

    Called only after the customer has explicitly approved. Never automatic.
    """
    result = await db.execute(
        select(SpendingAuthorization).where(
            SpendingAuthorization.order_id == order_id
        )
    )
    auth = result.scalar_one()
    auth.cap = auth.cap + extra
    await db.flush()
    return auth


async def _register_account_use(
    db: AsyncSession, account_number: str, bank_code: str
) -> VendorAccount:
    result = await db.execute(
        select(VendorAccount).where(VendorAccount.account_number == account_number)
    )
    acct = result.scalar_one_or_none()
    if acct is None:
        acct = VendorAccount(
            account_number=account_number, bank_code=bank_code, times_used=1
        )
        db.add(acct)
    else:
        acct.times_used += 1
    await db.flush()
    return acct


async def _daily_outbound(db: AsyncSession) -> Decimal:
    """Sum of successful vendor transfers today, for the daily cap check."""
    start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    result = await db.execute(
        select(VendorTransfer).where(
            VendorTransfer.status == TransactionStatus.SUCCESS,
            VendorTransfer.created_at >= start,
        )
    )
    return sum(
        (t.amount for t in result.scalars().all()), start=Decimal("0.00")
    )


async def pay_vendor(
    db: AsyncSession,
    *,
    order: Order,
    agent_id: uuid.UUID,
    account_number: str,
    bank_code: str,
    items: list[dict],
    seller_id: uuid.UUID | None = None,
    photo_ref: str | None = None,
) -> VendorTransfer:
    """The core JIT operation: authorize, transfer, record, debit the pool.

    `items` is `[{"item_id": ..., "price": ...}, ...]` - the order items this
    one transfer covers (a stall purchase can cover several) together with
    what the agent actually paid for EACH one. The transfer amount is always
    the sum of these - there is no separate free-typed total, so the money
    that moves and the prices recorded can never disagree. Each item's own
    confirmed_price is set from its own entry, never an even split of the
    transfer total.
    """
    if order.agent_id != agent_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not the assigned agent")
    if order.status is not OrderStatus.SHOPPING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Can only pay vendors while shopping"
        )
    item_by_id = {it.id: it for it in order.items}
    for entry in items:
        if entry["item_id"] not in item_by_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Item {entry['item_id']} is not on this order",
            )
    amount = sum((entry["price"] for entry in items), start=Decimal("0.00"))
    if amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amount must be positive")

    # --- Safety cap: no single transfer above the ceiling ---
    if amount > Decimal(settings.max_transfer_naira):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Transfer exceeds the per-transfer cap of N{settings.max_transfer_naira}",
        )

    # --- Authorization: spent + this must fit under the order's cap ---
    auth = await get_or_create_authorization(db, order)
    if auth.spent + amount > auth.cap:
        overage = (auth.spent + amount) - auth.cap
        await notif_service.send(
            db,
            user_id=order.customer_id,
            order_id=order.id,
            kind="overage_approval",
            message=(
                f"Your agent needs to spend N{amount} at a stall, which is over "
                f"your approved limit. Approve an increase of N{overage} to continue?"
            ),
        )
        # flush() alone is NOT enough here: get_db rolls back the session on
        # ANY exception leaving the request, including this deliberate 402 -
        # and rollback undoes flushed-but-uncommitted work right along with
        # it. Only a real commit survives past the raise below.
        await db.commit()
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Amount exceeds the order's approved spending cap - customer must "
            "approve the increase first",
        )

    # --- Safety cap: daily outbound ceiling ---
    if await _daily_outbound(db) + amount > Decimal(settings.max_daily_transfers_naira):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Daily transfer ceiling reached",
        )

    # --- Float pool must actually have the money ---
    pool = await float_service.get_pool_balance(db, order.market_id)
    emtl = fees.emtl_for_transfer(amount)
    if pool < amount + emtl:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED, "Float pool has insufficient funds"
        )

    await _register_account_use(db, account_number, bank_code)

    reference = f"vt_{order.id.hex[:8]}_{uuid.uuid4().hex[:10]}"
    transfer = VendorTransfer(
        order_id=order.id,
        seller_id=seller_id,
        account_number=account_number,
        bank_code=bank_code,
        amount=amount,
        emtl=emtl,
        reference=reference,
        status=TransactionStatus.PENDING,
        photo_ref=photo_ref,
    )
    db.add(transfer)
    await db.flush()

    # --- Execute on the rail ---
    try:
        result = await transfers.send_transfer(
            account_number=account_number, bank_code=bank_code,
            amount_naira=amount, reference=reference,
        )
    except Exception:
        transfer.status = TransactionStatus.FAILED
        # A flush() alone is not enough here: get_db rolls back the session on
        # ANY exception leaving the request, including the deliberate 502
        # below - and rollback undoes flushed-but-uncommitted work right along
        # with it (same gotcha as the spending-cap 402 above). Only a commit
        # makes the FAILED row - and the admin visibility/retry it enables -
        # survive past this raise.
        await db.commit()
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Transfer failed - money did not leave. You can retry.",
        )

    transfer.status = TransactionStatus.SUCCESS
    rail_fee = result.get("fee")
    if rail_fee is not None:
        transfer.fee = Decimal(str(rail_fee)) / 100  # kobo -> naira

    # --- Debit the pool: goods, fee, and stamp duty as separate lines ---
    await float_service.record_movement(
        db, direction=LedgerDirection.DEBIT, amount=amount, order_id=order.id,
        market_id=order.market_id, note=f"Vendor payment {reference}",
    )
    if transfer.fee > 0:
        await float_service.record_movement(
            db, direction=LedgerDirection.DEBIT, amount=transfer.fee,
            order_id=order.id, market_id=order.market_id, note=f"Transfer fee {reference}",
        )
    if emtl > 0:
        await float_service.record_movement(
            db, direction=LedgerDirection.DEBIT, amount=emtl,
            order_id=order.id, market_id=order.market_id, note=f"EMTL stamp duty {reference}",
        )

    # --- Update the authorization and the covered items ---
    auth.spent = auth.spent + amount
    # Each item's confirmed price is exactly what the agent typed for IT -
    # never an even split of the transfer total (see the docstring above).
    for entry in items:
        it = item_by_id[entry["item_id"]]
        it.confirmed_price = entry["price"]
        it.confirmed_at = datetime.now(timezone.utc)
        it.vendor_transfer_id = transfer.id
    # Track the order's running pass-through totals.
    order.emtl_total = order.emtl_total + emtl
    order.transfer_fees_total = order.transfer_fees_total + transfer.fee
    await db.flush()
    return transfer
