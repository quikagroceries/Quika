import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service as admin_service
from app.agent_applications.models import AgentApplication
from app.auth.models import User
from app.core.enums import ApplicationStatus, UserRole
from app.markets.models import Market


async def apply(
    db: AsyncSession, *, user: User, market_id: uuid.UUID, note: str | None
) -> AgentApplication:
    if user.role is not UserRole.CUSTOMER:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only customers can apply to become an agent"
        )

    market_result = await db.execute(select(Market).where(Market.id == market_id))
    if market_result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Market not found")

    existing = await db.execute(
        select(AgentApplication).where(
            AgentApplication.user_id == user.id,
            AgentApplication.status == ApplicationStatus.PENDING,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You already have a pending application"
        )

    application = AgentApplication(user_id=user.id, market_id=market_id, note=note)
    db.add(application)
    await db.flush()
    return application


async def list_my_applications(
    db: AsyncSession, *, user_id: uuid.UUID
) -> list[AgentApplication]:
    result = await db.execute(
        select(AgentApplication)
        .where(AgentApplication.user_id == user_id)
        .order_by(AgentApplication.created_at.desc())
    )
    return list(result.scalars().all())


async def list_applications(
    db: AsyncSession, *, status_filter: ApplicationStatus | None
) -> list[AgentApplication]:
    stmt = select(AgentApplication)
    if status_filter is not None:
        stmt = stmt.where(AgentApplication.status == status_filter)
    result = await db.execute(stmt.order_by(AgentApplication.created_at.desc()))
    return list(result.scalars().all())


async def _get_application(
    db: AsyncSession, application_id: uuid.UUID
) -> AgentApplication:
    result = await db.execute(
        select(AgentApplication).where(AgentApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return application


async def approve(
    db: AsyncSession, *, application_id: uuid.UUID, admin: User
) -> AgentApplication:
    application = await _get_application(db, application_id)
    if application.status is not ApplicationStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Application has already been reviewed"
        )

    await admin_service.promote_to_agent(
        db, user_id=application.user_id, market_id=application.market_id
    )
    application.status = ApplicationStatus.APPROVED
    application.reviewed_by = admin.id
    application.reviewed_at = datetime.now(timezone.utc)
    await db.flush()
    return application


async def reject(
    db: AsyncSession, *, application_id: uuid.UUID, admin: User
) -> AgentApplication:
    application = await _get_application(db, application_id)
    if application.status is not ApplicationStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Application has already been reviewed"
        )

    application.status = ApplicationStatus.REJECTED
    application.reviewed_by = admin.id
    application.reviewed_at = datetime.now(timezone.utc)
    await db.flush()
    return application
