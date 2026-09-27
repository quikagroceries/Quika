"""Admin-only account management: turning an approved agent application into
an actual agent account, and the one-time admin bootstrap that solves the
chicken-and-egg problem of needing an admin to create the first admin.
"""

import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import settings
from app.core.enums import OrderStatus, RiderStatus, TransactionStatus, UserRole, UserStatus
from app.core.security import hash_password, verify_password
from app.float.models import FloatLedger
from app.jit import service as jit_service
from app.jit.models import SpendingAuthorization, VendorTransfer
from app.markets.models import Agent, Market
from app.orders import service as orders_service
from app.wallet import service as wallet_service
from app.wallet.models import Wallet, WalletLedger
from app.orders.models import Order
from app.riders.models import Rider


async def bootstrap_admin(db: AsyncSession, email: str | None, password: str | None) -> None:
    if not email or not password:
        return
    email = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        db.add(
            User(
                email=email,
                password_hash=hash_password(password),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                basket_cap_kobo=settings.default_basket_cap_kobo,
            )
        )
    else:
        user.role = UserRole.ADMIN
        user.password_hash = hash_password(password)
        user.must_change_password = False
    await db.commit()


def _is_bootstrap_admin(user: User) -> bool:
    email = (settings.bootstrap_admin_email or "").strip().lower()
    return bool(email) and user.email == email


def _admin_out(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "status": user.status.value,
        "must_change_password": user.must_change_password,
        # Can sign in at POST /admin/login at all (legacy phone-only admins can't).
        "has_password": user.password_hash is not None,
        "is_bootstrap": _is_bootstrap_admin(user),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


async def list_admins(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(User).where(User.role == UserRole.ADMIN).order_by(User.created_at)
    )
    return [_admin_out(u) for u in result.scalars().all()]


async def create_admin(
    db: AsyncSession, *, email: str, full_name: str | None, temporary_password: str
) -> dict:
    """A brand-new admin account on a temporary password they must replace
    at first sign-in. Never promotes an existing customer/agent account -
    admin access shouldn't quietly inherit someone's orders and wallet."""
    email = email.strip().lower()
    if "@" not in email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Enter a valid email")
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        detail = (
            "That email is already an admin"
            if existing.role is UserRole.ADMIN
            else "That email already belongs to a non-admin account"
        )
        raise HTTPException(status.HTTP_409_CONFLICT, detail)
    user = User(
        email=email,
        full_name=(full_name or "").strip() or None,
        password_hash=hash_password(temporary_password),
        must_change_password=True,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_email_verified=True,
        basket_cap_kobo=settings.default_basket_cap_kobo,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return _admin_out(user)


async def remove_admin(db: AsyncSession, *, user_id: uuid.UUID, actor: User) -> None:
    """Revoke admin access: back to a plain customer with no password, so
    POST /admin/login stops working for them immediately."""
    user = await _get_user(db, user_id)
    if user.role is not UserRole.ADMIN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Admin not found")
    if user.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't remove your own admin access")
    if _is_bootstrap_admin(user):
        # bootstrap_admin would just recreate it on the next restart.
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This is the owner account from the server's BOOTSTRAP_ADMIN_EMAIL - change it there instead",
        )
    user.role = UserRole.CUSTOMER
    user.password_hash = None
    user.must_change_password = False
    await db.flush()


async def change_admin_password(
    db: AsyncSession, *, user: User, current_password: str, new_password: str
) -> None:
    if user.role is not UserRole.ADMIN or not user.password_hash:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    if new_password == current_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick a password different from the current one")
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    await db.flush()


async def authenticate_admin(db: AsyncSession, *, email: str, password: str) -> User:
    """Email+password login, admins only — the standard credential check,
    never the phone/OTP flow the rest of the app uses."""
    email = email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if user is None or user.role is not UserRole.ADMIN or not user.password_hash:
        raise invalid
    if not verify_password(password, user.password_hash):
        raise invalid
    if user.status is UserStatus.LOCKED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is locked")
    if user.status is UserStatus.SUSPENDED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been suspended")
    return user


async def _get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


async def promote_to_agent(
    db: AsyncSession, *, user_id: uuid.UUID, market_id: uuid.UUID
) -> User:
    user = await _get_user(db, user_id)

    market_result = await db.execute(select(Market).where(Market.id == market_id))
    if market_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")

    user.role = UserRole.AGENT

    agent_result = await db.execute(select(Agent).where(Agent.user_id == user_id))
    agent = agent_result.scalar_one_or_none()
    if agent is None:
        db.add(Agent(user_id=user_id, assigned_market_id=market_id))
    else:
        agent.assigned_market_id = market_id
        agent.is_available = True

    await db.flush()
    return user


# Normalizes a DB-loaded timestamp for comparison - SQLite (tests) hands back
# naive datetimes even for timezone-aware columns; Postgres doesn't. Same
# pattern as agent.service.get_summary's _paid_at helper.
def _aware(ts: datetime) -> datetime:
    return ts if ts.tzinfo is not None else ts.replace(tzinfo=timezone.utc)


async def list_agents(db: AsyncSession) -> list[dict]:
    """Every agent, with their market/availability and lifetime earnings -
    the roster behind the Agents admin screen."""
    result = await db.execute(select(Agent, User).join(User, User.id == Agent.user_id))
    rows = result.all()

    paid_result = await db.execute(select(Order).where(Order.paid_at.is_not(None)))
    by_agent: dict[uuid.UUID, list[Order]] = defaultdict(list)
    for order in paid_result.scalars().all():
        if order.agent_id is not None:
            by_agent[order.agent_id].append(order)

    return [
        {
            "id": str(agent.id),
            "user_id": str(user.id),
            "phone": user.phone,
            "full_name": user.full_name,
            "assigned_market_id": str(agent.assigned_market_id) if agent.assigned_market_id else None,
            "is_available": agent.is_available,
            "on_duty": agent.on_duty,
            "completed_orders": len(by_agent.get(user.id, [])),
            "earnings_total": str(
                sum((o.agent_share for o in by_agent.get(user.id, [])), start=Decimal("0.00"))
            ),
        }
        for agent, user in rows
    ]


def _rider_out(rider: Rider) -> dict:
    return {
        "id": str(rider.id),
        "full_name": rider.full_name,
        "phone": rider.phone,
        "area": rider.area,
        "vehicle": rider.vehicle,
        "market_id": str(rider.market_id) if rider.market_id else None,
        "status": rider.status.value,
        "created_at": rider.created_at.isoformat() if rider.created_at else None,
    }


async def list_riders(db: AsyncSession) -> list[dict]:
    """The approved-rider roster behind the Riders admin screen."""
    result = await db.execute(select(Rider).order_by(Rider.created_at.desc()))
    return [_rider_out(r) for r in result.scalars().all()]


async def set_rider_status(db: AsyncSession, *, rider_id: uuid.UUID, status_: RiderStatus) -> dict:
    result = await db.execute(select(Rider).where(Rider.id == rider_id))
    rider = result.scalar_one_or_none()
    if rider is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rider not found")
    rider.status = status_
    await db.flush()
    return _rider_out(rider)


async def clear_user_flag(db: AsyncSession, *, user_id: uuid.UUID) -> User:
    """Admin pardon: resets must_prepay, the non-payment count, and any
    FLAGGED/LOCKED status back to normal in one action.

    must_prepay normally clears itself the moment the customer completes a
    prepaid order (see payments.service) - this is the manual override for
    an admin judgment call, not a replacement for that automatic path.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.must_prepay = False
    user.non_payment_count = 0
    if user.status in (UserStatus.FLAGGED, UserStatus.LOCKED):
        user.status = UserStatus.ACTIVE
    await db.flush()
    return user


async def get_analytics(db: AsyncSession, *, days: int = 30) -> dict:
    """Everything here is computed straight from data the app already
    records (paid_at, company_share, agent_share, status, float ledger
    amounts) - deliberately nothing that isn't actually tracked, rather than
    approximate a metric with no real backing data.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # One query, all filtering/bucketing in Python - SQLite (tests) can't be
    # trusted to compare a naive stored datetime against an aware `since`
    # correctly (same reasoning as agent.service.get_summary, which filters
    # today/week in Python for the same reason), and at pilot scale this is
    # cheap either way.
    all_paid_result = await db.execute(select(Order).where(Order.paid_at.is_not(None)))
    all_paid_orders = list(all_paid_result.scalars().all())

    volume: dict[str, int] = defaultdict(int)
    revenue: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    for o in all_paid_orders:
        paid_at = _aware(o.paid_at)
        if paid_at < since:
            continue
        day = paid_at.date().isoformat()
        volume[day] += 1
        revenue[day] += o.company_share
    volume_by_day = [{"date": d, "orders": c} for d, c in sorted(volume.items())]
    revenue_by_day = [{"date": d, "company_share": str(revenue[d])} for d in sorted(revenue)]

    # Agent + market activity are all-time, not windowed - lifetime totals,
    # same as the Agents screen's earnings_total.

    agents_result = await db.execute(select(Agent, User).join(User, User.id == Agent.user_id))
    by_agent: dict[uuid.UUID, list[Order]] = defaultdict(list)
    for o in all_paid_orders:
        if o.agent_id is not None:
            by_agent[o.agent_id].append(o)
    agent_activity = [
        {
            "agent_id": str(user.id),
            "phone": user.phone,
            "full_name": user.full_name,
            "completed_orders": len(by_agent.get(user.id, [])),
            "earnings": str(
                sum((o.agent_share for o in by_agent.get(user.id, [])), start=Decimal("0.00"))
            ),
        }
        for agent, user in agents_result.all()
    ]

    market_orders: dict[uuid.UUID, int] = defaultdict(int)
    for o in all_paid_orders:
        market_orders[o.market_id] += 1
    ledger_result = await db.execute(
        select(FloatLedger.market_id, FloatLedger.amount).where(FloatLedger.market_id.is_not(None))
    )
    market_turnover: dict[uuid.UUID, Decimal] = defaultdict(lambda: Decimal("0.00"))
    for market_id, amount in ledger_result.all():
        market_turnover[market_id] += amount
    market_activity = [
        {
            "market_id": str(mid),
            "orders": market_orders.get(mid, 0),
            "float_turnover": str(market_turnover.get(mid, Decimal("0.00"))),
        }
        for mid in set(market_orders) | set(market_turnover)
    ]

    # Completion/cancellation/non-payment rates - terminal statuses only, so
    # an order still in flight (hasn't reached an outcome yet) doesn't dilute
    # a rate that's meant to describe resolved orders.
    terminal_statuses = [
        OrderStatus.DELIVERED, OrderStatus.CLOSED, OrderStatus.CANCELLED,
        OrderStatus.CANCELLED_UNPAID, OrderStatus.DISPUTED,
    ]
    status_result = await db.execute(
        select(Order.status).where(Order.status.in_(terminal_statuses))
    )
    statuses = [s for (s,) in status_result.all()]
    rates = {
        "total_terminal": len(statuses),
        "completed": sum(1 for s in statuses if s in (OrderStatus.DELIVERED, OrderStatus.CLOSED)),
        "cancelled": sum(1 for s in statuses if s is OrderStatus.CANCELLED),
        "cancelled_unpaid": sum(1 for s in statuses if s is OrderStatus.CANCELLED_UNPAID),
        "disputed": sum(1 for s in statuses if s is OrderStatus.DISPUTED),
    }

    return {
        "volume_by_day": volume_by_day,
        "revenue_by_day": revenue_by_day,
        "agent_activity": agent_activity,
        "market_activity": market_activity,
        "rates": rates,
    }


# --- User detail, suspend/reactivate (soft delete) ---------------------------

async def get_user_detail(db: AsyncSession, *, user_id: uuid.UUID) -> dict:
    """Everything an admin needs to handle a support case for one user without
    touching the database: profile, wallet, recent transactions, recent orders."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = wallet_result.scalar_one_or_none()
    ledger: list[WalletLedger] = []
    if wallet is not None:
        ledger = (
            (
                await db.execute(
                    select(WalletLedger)
                    .where(WalletLedger.wallet_id == wallet.id)
                    .order_by(WalletLedger.seq.desc())
                    .limit(20)
                )
            )
            .scalars()
            .all()
        )

    orders_result = await db.execute(
        select(Order)
        .where((Order.customer_id == user_id) | (Order.agent_id == user_id))
        .order_by(Order.created_at.desc())
        .limit(20)
    )
    orders = orders_result.scalars().all()

    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "status": user.status.value,
        "is_email_verified": user.is_email_verified,
        "is_phone_verified": user.is_phone_verified,
        "non_payment_count": user.non_payment_count,
        "must_prepay": user.must_prepay,
        "basket_cap_kobo": user.basket_cap_kobo,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "wallet_balance": str(wallet.balance) if wallet else "0.00",
        "wallet_ledger": [
            {
                "id": str(l.id),
                "direction": l.direction.value,
                "amount": str(l.amount),
                "balance_after": str(l.balance_after),
                "note": l.note,
                "order_id": str(l.order_id) if l.order_id else None,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in ledger
        ],
        "orders": [
            {
                "id": str(o.id),
                "status": o.status.value,
                "grand_total": str(o.grand_total),
                "as_customer": o.customer_id == user_id,
                "as_agent": o.agent_id == user_id,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ],
    }


async def suspend_user(db: AsyncSession, *, user_id: uuid.UUID, admin_id: uuid.UUID) -> User:
    """Soft delete: sign-in and every API call are refused immediately (see
    core/security.py::get_current_user), but the account and every order/
    wallet/payment record it's linked to stay intact. Reversible any time."""
    if user_id == admin_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't suspend your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role is UserRole.ADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Remove the admin instead of suspending them")
    user.status = UserStatus.SUSPENDED
    await db.flush()
    return user


async def reactivate_user(db: AsyncSession, *, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.status is UserStatus.SUSPENDED:
        user.status = UserStatus.ACTIVE
    await db.flush()
    return user


# --- Wallet adjustments (manual credit/refund) --------------------------------

async def adjust_wallet(
    db: AsyncSession, *, user_id: uuid.UUID, direction: str, amount: Decimal, note: str
) -> Wallet:
    """Support tool: credit or debit a customer's wallet directly, with a
    mandatory note, instead of doing it with a database edit. Every call
    writes its own WalletLedger row (see wallet/service.py) so it's always
    visible in that customer's history, not a silent balance change."""
    if amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Amount must be positive")
    if not note or not note.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A note is required for a manual wallet adjustment")
    tagged_note = f"Admin adjustment: {note.strip()}"
    if direction == "credit":
        return await wallet_service.credit(db, user_id, amount, note=tagged_note)
    if direction == "debit":
        return await wallet_service.debit(db, user_id, amount, note=tagged_note)
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "direction must be 'credit' or 'debit'")


# --- Vendor transfer visibility (JIT payouts) ---------------------------------

async def list_vendor_transfers(
    db: AsyncSession, *, only_failed: bool = False, limit: int = 100
) -> dict:
    """Every vendor payout attempt, newest first - so a failed one (money that
    never left, per jit/service.py::pay_vendor) is something an admin can see
    and act on directly, instead of it only ever showing up in a database query."""
    q = select(VendorTransfer).order_by(VendorTransfer.created_at.desc()).limit(limit)
    if only_failed:
        q = q.where(VendorTransfer.status == TransactionStatus.FAILED)
    rows = (await db.execute(q)).scalars().all()
    return {
        "transfers": [
            {
                "id": str(t.id),
                "order_id": str(t.order_id),
                "account_number": t.account_number,
                "bank_code": t.bank_code,
                "amount": str(t.amount),
                "fee": str(t.fee),
                "emtl": str(t.emtl),
                "reference": t.reference,
                "status": t.status.value,
                "photo_ref": t.photo_ref,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in rows
        ]
    }


async def acknowledge_vendor_transfer(
    db: AsyncSession, *, transfer_id: uuid.UUID, note: str
) -> VendorTransfer:
    """Records that an admin has looked into a failed payout and how it was
    resolved (e.g. "agent re-sent it manually, ref vt_..."), without moving
    any money itself.

    A failed transfer can't be safely re-sent from here: the rail call in
    pay_vendor is only ever retried by the agent re-submitting the same items,
    because nothing records which order items a transfer was for until AFTER
    it succeeds - re-sending blind from the admin side risks paying the same
    items twice. This is the honest, safe action available today; a proper
    "resend this transfer" tool needs the item list preserved on failure too.
    """
    result = await db.execute(select(VendorTransfer).where(VendorTransfer.id == transfer_id))
    transfer = result.scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transfer not found")
    if transfer.status is not TransactionStatus.FAILED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a failed transfer can be acknowledged")
    if not note or not note.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A note is required")
    transfer.photo_ref = f"[admin-acknowledged: {note.strip()}] {transfer.photo_ref or ''}".strip()
    await db.flush()
    return transfer


# --- Spending cap ---------------------------------------------------------

async def admin_raise_cap(db: AsyncSession, *, order_id: uuid.UUID, extra: Decimal) -> SpendingAuthorization:
    """Admin-side mirror of jit/routes.py::raise_cap - normally only the
    customer can approve a higher spending ceiling for their own order; this
    is the support override for when they've approved it by phone/chat instead."""
    if extra <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "extra must be positive")
    return await jit_service.raise_authorization(db, order_id, extra)


# --- Order cancel + refund --------------------------------------------------

async def admin_cancel_order(
    db: AsyncSession, *, order_id: uuid.UUID, refund_amount: Decimal, note: str
) -> Order:
    """Cancel an order from any non-terminal, pre-delivery state and refund a
    specific, admin-entered amount to the customer's wallet.

    The refund amount is never computed automatically: how much was actually
    collected can come from a wallet payment, a Paystack checkout, or a
    deposit, and getting that wrong is real money. The admin sees the order's
    deposit/payment fields (get_user_detail / the order detail endpoint) and
    enters the right figure, same as any manual refund a support agent makes
    elsewhere.
    """
    if not note or not note.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A note is required to cancel an order")
    if refund_amount < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "refund_amount can't be negative")
    return await orders_service.admin_cancel_order(
        db, order_id=order_id, refund_amount=refund_amount, note=note.strip()
    )
