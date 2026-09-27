"""Admin oversight — the read endpoints behind the (future) dashboard.

These are the numbers you need the day real orders run: how much float is
left, what's in flight, who to watch. All admin-gated.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service as admin_service
from app.admin.schemas import AdminCreateIn, AdminLoginIn, AdminPasswordChangeIn, RiderStatusIn
from app.auth.models import User
from app.auth.schemas import TokenOut
from app.core.database import get_db
from app.core.enums import OrderStatus, UserRole, UserStatus
from app.core.security import create_access_token, get_current_user, require_role
from app.float import service as float_service
from app.float.models import FloatLedger
from app.orders.models import Order

router = APIRouter()


@router.post("/login", response_model=TokenOut)
async def admin_login(body: AdminLoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    """Admin sign-in — email+password only, never phone/OTP like every other
    role (see admin.service.authenticate_admin)."""
    user = await admin_service.authenticate_admin(db, email=body.email, password=body.password)
    token = create_access_token(user.id, user.role)
    return TokenOut(access_token=token)


@router.post("/me/password", status_code=204)
async def change_my_password(
    body: AdminPasswordChangeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    """Set your own password. get_current_user, not require_role: this is
    the one admin endpoint an admin still on a temporary password can use."""
    await admin_service.change_admin_password(
        db, user=user, current_password=body.current_password, new_password=body.new_password
    )


@router.get("/admins")
async def list_admins(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[dict]:
    return await admin_service.list_admins(db)


@router.post("/admins", status_code=201)
async def create_admin(
    body: AdminCreateIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Add an admin on a temporary password - share it with them privately;
    they must replace it at first sign-in."""
    return await admin_service.create_admin(
        db, email=body.email, full_name=body.full_name, temporary_password=body.temporary_password
    )


@router.delete("/admins/{user_id}", status_code=204)
async def remove_admin(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> None:
    await admin_service.remove_admin(db, user_id=user_id, actor=admin)

# Statuses that mean an order is still "in flight" (not finished/dead).
_ACTIVE = [
    OrderStatus.DRAFT, OrderStatus.AGENT_ASSIGNED, OrderStatus.SHOPPING,
    OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID, OrderStatus.PACKED,
    OrderStatus.OUT_FOR_DELIVERY,
]


@router.get("/float")
async def float_status(
    market_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Working capital left in a market's pool (or the global pool if omitted).

    If this runs low, no agent can shop in that market — the health metric.
    """
    balance = await float_service.get_pool_balance(db, market_id)
    stmt = select(FloatLedger).order_by(FloatLedger.created_at.desc()).limit(20)
    # Same market_id=None-means-legacy/global-pool semantics as
    # get_pool_balance - without this filter, recent_movements silently
    # showed the last 20 movements across EVERY market regardless of which
    # pool's balance was requested.
    stmt = stmt.where(FloatLedger.market_id.is_(None)) if market_id is None else stmt.where(FloatLedger.market_id == market_id)
    result = await db.execute(stmt)
    recent = [
        {
            "direction": e.direction.value,
            "amount": str(e.amount),
            "balance_after": str(e.balance_after),
            "note": e.note,
            "at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in result.scalars().all()
    ]
    return {"pool_balance": str(balance), "recent_movements": recent}


@router.get("/orders/in-flight")
async def in_flight_orders(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Every order not yet closed/cancelled, so you can spot what's stuck.

    Includes unassigned orders (no agent free at creation) — these need your
    attention: assign an agent manually or recruit more for that market.
    """
    result = await db.execute(
        select(Order).where(Order.status.in_(_ACTIVE)).order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    rows = [
        {
            "id": str(o.id),
            "status": o.status.value,
            "agent_assigned": o.agent_id is not None,
            "agent_id": str(o.agent_id) if o.agent_id else None,
            "customer_id": str(o.customer_id),
            "market_id": str(o.market_id),
            "grand_total": str(o.grand_total),
            "payment_window_expires_at": o.payment_window_expires_at.isoformat() if o.payment_window_expires_at else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    unassigned = sum(1 for o in orders if o.agent_id is None)
    return {"count": len(rows), "unassigned": unassigned, "orders": rows}


@router.get("/orders/losses")
async def order_losses(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Orders where the balance payment window lapsed after the agent had
    already spent real money at the market - the deposit is forfeited (see
    payments.service.expire_stale_orders), which is a recorded company loss,
    not a refund. This is that loss list: what was lost, and on which order/
    market/agent, so it can be tracked and followed up on.
    """
    result = await db.execute(
        select(Order)
        .where(Order.status == OrderStatus.CANCELLED_UNPAID)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    rows = [
        {
            "id": str(o.id),
            "customer_id": str(o.customer_id),
            "agent_id": str(o.agent_id) if o.agent_id else None,
            "market_id": str(o.market_id),
            "deposit_forfeited": str(o.deposit_amount),
            "grand_total": str(o.grand_total),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    total_forfeited = sum((o.deposit_amount for o in orders), start=Decimal("0.00"))
    return {"count": len(rows), "total_deposit_forfeited": str(total_forfeited), "orders": rows}


@router.get("/users")
async def list_users(
    q: str | None = None,
    role: UserRole | None = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Every registered account, newest first - however they signed up (phone,
    email or Google). `q` matches name, email or phone; `role` narrows to one
    kind of account."""
    limit = max(1, min(limit, 200))
    filters = []
    if role is not None:
        filters.append(User.role == role)
    if q and q.strip():
        like = f"%{q.strip().lower()}%"
        filters.append(
            or_(
                func.lower(func.coalesce(User.full_name, "")).like(like),
                func.lower(func.coalesce(User.email, "")).like(like),
                func.lower(func.coalesce(User.phone, "")).like(like),
            )
        )
    total = (await db.execute(select(func.count()).select_from(User).where(*filters))).scalar_one()
    by_role = {
        r.value: n
        for r, n in (await db.execute(select(User.role, func.count()).group_by(User.role))).all()
    }
    result = await db.execute(
        select(User).where(*filters).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    users = [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.value,
            "status": u.status.value,
            "is_email_verified": u.is_email_verified,
            "is_phone_verified": u.is_phone_verified,
            "non_payment_count": u.non_payment_count,
            "must_prepay": u.must_prepay,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in result.scalars().all()
    ]
    return {"total": total, "by_role": by_role, "users": users}


@router.get("/users/flagged")
async def flagged_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Customers with non-payment history or a flagged/locked status."""
    result = await db.execute(
        select(User).where(
            (User.non_payment_count > 0)
            | (User.status.in_([UserStatus.FLAGGED, UserStatus.LOCKED]))
        )
    )
    rows = [
        {
            "id": str(u.id),
            "phone": u.phone,
            "full_name": u.full_name,
            "status": u.status.value,
            "non_payment_count": u.non_payment_count,
            "must_prepay": u.must_prepay,
            "basket_cap_kobo": u.basket_cap_kobo,
        }
        for u in result.scalars().all()
    ]
    return {"count": len(rows), "users": rows}


@router.post("/users/{user_id}/clear-flag")
async def clear_user_flag(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Admin pardon - resets must_prepay/non_payment_count/FLAGGED-LOCKED
    status back to normal in one action. See admin.service.clear_user_flag."""
    user = await admin_service.clear_user_flag(db, user_id=user_id)
    return {
        "id": str(user.id),
        "status": user.status.value,
        "must_prepay": user.must_prepay,
        "non_payment_count": user.non_payment_count,
    }


@router.get("/agents")
async def list_agents(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[dict]:
    """Every agent, market + availability + lifetime earnings - the roster
    behind the Agents admin screen."""
    return await admin_service.list_agents(db)


@router.get("/riders")
async def list_riders(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[dict]:
    """Approved riders - area, vehicle, status - behind the Riders screen.
    Pending rider applications come from GET /agent-applications?kind=rider."""
    return await admin_service.list_riders(db)


@router.patch("/riders/{rider_id}")
async def set_rider_status(
    rider_id: uuid.UUID,
    body: RiderStatusIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Suspend or reactivate a rider."""
    return await admin_service.set_rider_status(db, rider_id=rider_id, status_=body.status)


@router.get("/analytics")
async def analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    """Order volume/revenue over the last `days`, lifetime agent/market
    activity, and completion/cancellation/non-payment rates - computed only
    from data actually recorded (see admin.service.get_analytics)."""
    return await admin_service.get_analytics(db, days=days)
