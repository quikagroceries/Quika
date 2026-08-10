"""Payment service — checkout, webhook confirmation, float credit-back, lapse.

This module closes the recycled-float loop. The webhook handler is the single
most important piece: it is the ONLY thing that moves an order to PAID, and the
state machine only allows delivery to begin from PAID — so this function is the
gate. It must be idempotent (Paystack retries) and it must verify authenticity
(never trust an unsigned "payment succeeded" call).
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import User
from app.core.enums import (
    LedgerDirection,
    OrderStatus,
    TransactionStatus,
)
from app.float import service as float_service
from app.orders.models import Order
from app.orders.state_machine import IllegalTransition, assert_can_transition
from app.payments import paystack
from app.payments.models import Transaction
from app.wallet import service as wallet_service


async def _load_order(db: AsyncSession, order_id: uuid.UUID) -> Order:
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


async def start_checkout(
    db: AsyncSession, *, order_id: uuid.UUID, customer: User, origin: str | None = None
) -> dict:
    """Customer-initiated. Creates a Paystack transaction for the grand total.

    origin (the frontend's own URL, e.g. http://localhost:5173) becomes the
    Paystack callback_url so the browser actually lands back on this app -
    see paystack.initialize_transaction's docstring for what happens without
    one. The reference is tagged onto that URL so the screen the customer
    lands on can reconcile immediately (see verify_checkout) instead of
    waiting on the webhook alone.
    """
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status is not OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Order is not awaiting payment",
        )

    reference = f"quika_{order.id.hex[:12]}_{uuid.uuid4().hex[:8]}"
    txn = Transaction(
        order_id=order.id,
        paystack_reference=reference,
        amount=order.grand_total,
        status=TransactionStatus.PENDING,
    )
    db.add(txn)
    await db.flush()

    # Email is optional on our user model; Paystack requires one, so fall back.
    email = f"{customer.phone.lstrip('+')}@quika.com"
    callback_url = f"{origin}/?order_ref={reference}" if origin else None
    data = await paystack.initialize_transaction(
        email=email, amount_naira=order.grand_total, reference=reference,
        callback_url=callback_url,
    )
    return {
        "authorization_url": data.get("authorization_url"),
        "reference": reference,
        "amount": order.grand_total,
    }


async def verify_checkout(
    db: AsyncSession, *, customer: User, order_id: uuid.UUID, reference: str
) -> dict:
    """Customer-triggered reconciliation for a balance payment, called right
    when they return from Paystack checkout - same reasoning as
    verify_wallet_funding: the webhook can't reach a local dev server and can
    lag even in production. Safe to call any number of times (confirm_payment
    is idempotent); the order-ownership check keeps it scoped to the caller's
    own transaction, since (unlike wallet funding) the customer id isn't
    encoded in this reference.
    """
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    result = await db.execute(
        select(Transaction).where(Transaction.paystack_reference == reference)
    )
    txn = result.scalar_one_or_none()
    if txn is None or txn.order_id != order.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")

    data = await paystack.verify_transaction(reference)
    verified = data.get("status") == "success"
    if verified:
        await confirm_payment(db, reference)
        await db.refresh(order)
    return {"status": order.status.value, "verified": verified}


async def confirm_payment(db: AsyncSession, reference: str) -> None:
    """Mark a transaction paid, move the order to PAID, refill the float pool.

    Idempotent: a second call for an already-successful reference is a no-op.
    Called by the webhook after signature verification.
    """
    result = await db.execute(
        select(Transaction).where(Transaction.paystack_reference == reference)
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        # Unknown reference — ignore rather than error, so retries don't loop.
        return
    if txn.status is TransactionStatus.SUCCESS:
        return  # already processed; idempotent no-op

    txn.status = TransactionStatus.SUCCESS
    order = await _load_order(db, txn.order_id)

    # The gate: only here does an order become eligible for delivery.
    try:
        assert_can_transition(order.status, OrderStatus.PAID)
    except IllegalTransition:
        # Order was cancelled/expired before payment landed. Money still came
        # in, so credit the pool but do NOT resurrect a dead order.
        await float_service.record_movement(
            db,
            direction=LedgerDirection.CREDIT,
            amount=txn.amount,
            order_id=order.id,
            market_id=order.market_id,
            note=f"Late payment on {order.status.value} order {reference}",
        )
        await db.flush()
        return

    order.status = OrderStatus.PAID
    order.paid_at = datetime.now(timezone.utc)
    # They paid — trust restored, lift the prepay requirement.
    cust = (await db.execute(select(User).where(User.id == order.customer_id))).scalar_one_or_none()
    if cust is not None and cust.must_prepay:
        cust.must_prepay = False

    # Recycle: the customer's payment flows back into the float pool.
    await float_service.record_movement(
        db,
        direction=LedgerDirection.CREDIT,
        amount=txn.amount,
        order_id=order.id,
        market_id=order.market_id,
        note=f"Customer payment {reference}",
    )
    await db.flush()


async def expire_stale_orders(db: AsyncSession) -> int:
    """Auto-cancel orders whose payment window has lapsed. Returns count.

    Intended to be run on a schedule (e.g. a cron/worker every minute). Exposed
    as an admin endpoint too so it can be triggered/tested manually in V1.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Order).where(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            Order.payment_window_expires_at.is_not(None),
            Order.payment_window_expires_at < now,
        )
    )
    stale = result.scalars().all()
    from app.auth.models import User
    for order in stale:
        order.status = OrderStatus.CANCELLED_UNPAID
        # The customer let the window lapse after the agent already shopped —
        # this is the expensive non-payment. Flag them to prepay in full next
        # time. (Below-threshold orders are the ones that reach here without a
        # deposit; large orders already paid a deposit up front.)
        cust = (
            await db.execute(select(User).where(User.id == order.customer_id))
        ).scalar_one_or_none()
        if cust is not None:
            cust.must_prepay = True
            cust.non_payment_count = cust.non_payment_count + 1
    await db.flush()
    return len(stale)


async def pay_from_wallet(
    db: AsyncSession, *, order_id: uuid.UUID, customer: User
) -> dict:
    """Pay an order from the customer's wallet balance.

    This is a PEER of paying by bank, not a fallback. Settles the amount still
    owed (grand total minus any deposit already paid), moves the order to PAID
    and recycles the money into the float pool — the same end state the
    Paystack webhook produces.
    """
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.status is not OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(status.HTTP_409_CONFLICT, "Order is not awaiting payment")

    collected = order.deposit_amount if order.deposit_paid_at is not None else Decimal("0.00")
    amount_due = order.grand_total - collected
    if amount_due < 0:
        amount_due = Decimal("0.00")

    if amount_due > 0:
        try:
            await wallet_service.debit(
                db, customer.id, amount_due, order_id=order.id,
                note=f"Payment for order {order.id}",
            )
        except ValueError:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                "Insufficient wallet balance - top up or pay by bank",
            )

    txn = Transaction(
        order_id=order.id,
        paystack_reference=f"wallet_{order.id.hex[:12]}",
        amount=amount_due,
        status=TransactionStatus.SUCCESS,
    )
    db.add(txn)

    assert_can_transition(order.status, OrderStatus.PAID)
    order.status = OrderStatus.PAID
    order.paid_at = datetime.now(timezone.utc)
    cust = (await db.execute(select(User).where(User.id == order.customer_id))).scalar_one_or_none()
    if cust is not None and cust.must_prepay:
        cust.must_prepay = False

    if amount_due > 0:
        await float_service.record_movement(
            db,
            direction=LedgerDirection.CREDIT,
            amount=amount_due,
            order_id=order.id,
            market_id=order.market_id,
            note="Customer wallet payment",
        )
    await db.flush()
    return {"paid": str(amount_due), "status": order.status.value}


async def init_wallet_funding(
    db: AsyncSession, *, customer: User, amount: Decimal, origin: str | None = None
) -> dict:
    """Start a Paystack top-up. The wallet is credited on webhook confirm, or
    sooner if the caller reconciles via verify_wallet_funding on return (see
    there for why relying on the webhook alone isn't enough)."""
    if amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amount must be positive")
    reference = f"fund_{customer.id.hex[:12]}_{uuid.uuid4().hex[:8]}"
    # Record a pending transaction (order_id null = wallet funding, not an order)
    txn = Transaction(
        order_id=None,
        paystack_reference=reference,
        amount=amount,
        status=TransactionStatus.PENDING,
    )
    db.add(txn)
    await db.flush()
    email = f"{customer.phone.lstrip('+')}@quika.com"
    callback_url = f"{origin}/?funded={reference}" if origin else None
    data = await paystack.initialize_transaction(
        email=email, amount_naira=amount, reference=reference,
        callback_url=callback_url,
    )
    return {
        "authorization_url": data.get("authorization_url"),
        "reference": reference,
        "amount": amount,
    }


async def verify_wallet_funding(
    db: AsyncSession, *, customer: User, reference: str
) -> dict:
    """Customer-triggered reconciliation for a wallet top-up.

    The webhook is the only thing that normally credits a top-up, but it's
    Paystack calling US - unreachable from a local dev server with no public
    URL, and even in production it can lag or occasionally get dropped. This
    lets the app ask Paystack directly whether a specific payment succeeded
    and credit it immediately, e.g. right when the customer returns from
    checkout. Safe to call for any reference, any number of times:
    confirm_funding_payment is idempotent (no-op once already SUCCESS), and
    the ownership check below means a customer can only ever reconcile their
    own top-up (the reference encodes the funding customer's id).
    """
    if not reference.startswith(f"fund_{customer.id.hex[:12]}_"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")
    data = await paystack.verify_transaction(reference)
    verified = data.get("status") == "success"
    if verified:
        await confirm_funding_payment(db, reference)
    balance = await wallet_service.get_balance(db, customer.id)
    return {"balance": str(balance), "verified": verified}


async def confirm_funding_payment(db: AsyncSession, reference: str) -> None:
    """Webhook path for wallet top-ups (reference starts with 'fund_')."""
    result = await db.execute(
        select(Transaction).where(Transaction.paystack_reference == reference)
    )
    txn = result.scalar_one_or_none()
    if txn is None or txn.status is TransactionStatus.SUCCESS:
        return
    txn.status = TransactionStatus.SUCCESS
    # Find the funding user from the transaction? We stored none, so verify with
    # Paystack to get the customer — simplest: the reference encodes the user id.
    user_hex = reference.split("_")[1]
    result = await db.execute(select(User))
    user = next(
        (u for u in result.scalars().all() if u.id.hex[:12] == user_hex), None
    )
    if user is not None:
        await wallet_service.confirm_funding(
            db, user_id=user.id, reference=reference, amount=txn.amount
        )
    await db.flush()


async def pay_deposit_from_wallet(
    db: AsyncSession, *, order_id: uuid.UUID, customer: User
) -> dict:
    """Collect the up-front deposit from the customer's wallet.

    This is the FIX for the deposit leak: the deposit was computed and later
    deducted from the bill but never actually collected. Now it must be paid
    before shopping can start (start_shopping gates on deposit_paid_at).

    The deposit is real money into the float pool, exactly like a payment — it
    is the first slice of the bill, not a held sum. Idempotent: paying an
    already-paid deposit is a no-op.
    """
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.deposit_amount <= 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "No deposit is required for this order"
        )
    if order.deposit_paid_at is not None:
        return {"paid": "0.00", "status": "deposit already paid"}

    try:
        await wallet_service.debit(
            db, customer.id, order.deposit_amount, order_id=order.id,
            note=f"Deposit for order {order.id}",
        )
    except ValueError:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Insufficient wallet balance for deposit - top up or pay by bank",
        )

    # Deposit lands in the float pool (it's real money the pool can shop with).
    await float_service.record_movement(
        db,
        direction=LedgerDirection.CREDIT,
        amount=order.deposit_amount,
        order_id=order.id,
        market_id=order.market_id,
        note="Customer deposit (wallet)",
    )
    order.deposit_paid_at = datetime.now(timezone.utc)
    await db.flush()
    return {"paid": str(order.deposit_amount), "status": "deposit paid"}


async def init_deposit_checkout(
    db: AsyncSession, *, order_id: uuid.UUID, customer: User, origin: str | None = None
) -> dict:
    """Start a Paystack payment for the deposit (bank option).

    The webhook credits the pool and sets deposit_paid_at, via a reference
    prefixed 'deposit_' so the webhook router knows what it is. origin becomes
    the callback_url (see start_checkout's docstring for why) tagged with the
    reference so the screen the customer returns to can reconcile immediately
    via verify_deposit_checkout.
    """
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    if order.deposit_amount <= 0:
        raise HTTPException(status.HTTP_409_CONFLICT, "No deposit required")
    if order.deposit_paid_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Deposit already paid")

    reference = f"deposit_{order.id.hex[:12]}_{uuid.uuid4().hex[:8]}"
    txn = Transaction(
        order_id=order.id,
        paystack_reference=reference,
        amount=order.deposit_amount,
        status=TransactionStatus.PENDING,
    )
    db.add(txn)
    await db.flush()
    email = f"{customer.phone.lstrip('+')}@quika.com"
    callback_url = f"{origin}/?order_deposit_ref={reference}" if origin else None
    data = await paystack.initialize_transaction(
        email=email, amount_naira=order.deposit_amount, reference=reference,
        callback_url=callback_url,
    )
    return {
        "authorization_url": data.get("authorization_url"),
        "reference": reference,
        "amount": order.deposit_amount,
    }


async def verify_deposit_checkout(
    db: AsyncSession, *, customer: User, order_id: uuid.UUID, reference: str
) -> dict:
    """Customer-triggered reconciliation for a deposit payment - same
    reasoning as verify_checkout, mirrored for the deposit path."""
    order = await _load_order(db, order_id)
    if order.customer_id != customer.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    result = await db.execute(
        select(Transaction).where(Transaction.paystack_reference == reference)
    )
    txn = result.scalar_one_or_none()
    if txn is None or txn.order_id != order.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your transaction")

    data = await paystack.verify_transaction(reference)
    verified = data.get("status") == "success"
    if verified:
        await confirm_deposit_payment(db, reference)
        await db.refresh(order)
    return {"deposit_paid": order.deposit_paid_at is not None, "verified": verified}


async def confirm_deposit_payment(db: AsyncSession, reference: str) -> None:
    """Webhook path for a deposit paid by bank. Idempotent."""
    result = await db.execute(
        select(Transaction).where(Transaction.paystack_reference == reference)
    )
    txn = result.scalar_one_or_none()
    if txn is None or txn.status is TransactionStatus.SUCCESS:
        return
    txn.status = TransactionStatus.SUCCESS
    order = await _load_order(db, txn.order_id)
    if order.deposit_paid_at is None:
        order.deposit_paid_at = datetime.now(timezone.utc)
        await float_service.record_movement(
            db,
            direction=LedgerDirection.CREDIT,
            amount=txn.amount,
            order_id=order.id,
            market_id=order.market_id,
            note=f"Customer deposit (bank) {reference}",
        )
    await db.flush()
