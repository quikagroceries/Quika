import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_applications import service
from app.agent_applications.schemas import AgentApplicationOut, ApplyAgentIn
from app.auth.models import User
from app.core.database import get_db
from app.core.enums import ApplicationStatus, UserRole
from app.core.security import get_current_user, require_role

router = APIRouter()


@router.post("", response_model=AgentApplicationOut, status_code=201)
async def apply(
    body: ApplyAgentIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AgentApplicationOut:
    return await service.apply(
        db, user=user, market_id=body.market_id, note=body.note
    )


@router.get("/me", response_model=list[AgentApplicationOut])
async def my_applications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AgentApplicationOut]:
    return await service.list_my_applications(db, user_id=user.id)


@router.get("", response_model=list[AgentApplicationOut])
async def list_applications(
    status: ApplicationStatus | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AgentApplicationOut]:
    return await service.list_applications(db, status_filter=status)


@router.post("/{application_id}/approve", response_model=AgentApplicationOut)
async def approve(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> AgentApplicationOut:
    return await service.approve(db, application_id=application_id, admin=admin)


@router.post("/{application_id}/reject", response_model=AgentApplicationOut)
async def reject(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> AgentApplicationOut:
    return await service.reject(db, application_id=application_id, admin=admin)
