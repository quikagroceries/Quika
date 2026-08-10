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
from app.core.enums import OrderStatus, UserRole, UserStatus
from app.core.phone import normalize_phone
from app.float.models import FloatLedger
from app.markets.models import Agent, Market
from app.orders.models import Order


async def bootstrap_admin(db: AsyncSession, phone: str | None) -> None:
    if not phone:
        return
    phone = normalize_phone(phone)
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if user is None:
        db.add(
            User(
                phone=phone,
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_phone_verified=False,
                basket_cap_kobo=settings.default_basket_cap_kobo,
            )
        )
    elif user.role is not UserRole.ADMIN:
        user.role = UserRole.ADMIN
    await db.commit()


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
