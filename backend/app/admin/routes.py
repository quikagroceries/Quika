"""Admin oversight — the read endpoints behind the (future) dashboard.

These are the numbers you need the day real orders run: how much float is
left, what's in flight, who to watch. All admin-gated.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service as admin_service
from app.admin.schemas import AdminLoginIn
from app.auth.models import User
from app.auth.schemas import TokenOut
from app.core.database import get_db
from app.core.enums import OrderStatus, UserRole, UserStatus
from app.core.security import create_access_token, require_role
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
