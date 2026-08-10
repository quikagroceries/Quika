"""Agent auto-assignment.

When an order is created, find an available agent covering its market and
assign them automatically. If none are free, the order stays unassigned and an
admin is alerted — the order never silently disappears. Manual assignment
remains available as an admin override.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.markets.models import Agent


async def find_available_agent(
    db: AsyncSession,
    market_id: uuid.UUID,
    *,
    exclude_ids: list[uuid.UUID] | None = None,
) -> Agent | None:
    """An agent assigned to this market, currently free, and on duty.

    on_duty excludes an agent who's switched into customer mode to shop for
    themselves (see markets.service.set_duty) - without this, an agent
    browsing as a customer could be auto-assigned their own order. is_available
    alone isn't enough: it only tracks "not mid-shopping", nothing about which
    mode they're in.

    exclude_ids (agent USER ids) is the propose/accept flow's "see another"
    mechanism (orders.service.see_another) - agents the customer has already
    turned down for THIS order, so re-proposing never repeats one.
    """
    stmt = select(Agent).where(
        Agent.assigned_market_id == market_id,
        Agent.is_available.is_(True),
        Agent.on_duty.is_(True),
    )
    if exclude_ids:
        stmt = stmt.where(Agent.user_id.notin_(exclude_ids))
    stmt = (
        # Deterministic tie-break: without an ORDER BY, Postgres may return
        # any matching row, so which agent gets picked would be unpredictable
        # whenever more than one covers the same market.
        stmt.order_by(Agent.id).limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def set_agent_availability(
    db: AsyncSession, agent_user_id: uuid.UUID, available: bool
) -> None:
    """Flip an agent's availability by their USER id.

    Busy when they start shopping, free again when they finish — so two orders
    can't land on one agent at once.
    """
    result = await db.execute(
        select(Agent).where(Agent.user_id == agent_user_id)
    )
    agent = result.scalar_one_or_none()
    if agent is not None:
        agent.is_available = available
        await db.flush()
