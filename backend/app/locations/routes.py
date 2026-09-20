from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.locations import service
from app.locations.schemas import PopularLocationOut, TrackLocationIn

router = APIRouter()


@router.post("/track", status_code=204)
async def track_location(
    body: TrackLocationIn,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> None:
    """Log a location pick - guests included, so "popular areas" reflects
    everyone browsing, not just signed-in users."""
    await service.record_location_search(
        db,
        user_id=user.id if user else None,
        label=body.label,
        latitude=body.latitude,
        longitude=body.longitude,
    )


@router.get("/popular", response_model=list[PopularLocationOut])
async def popular_locations(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await service.get_popular_locations(db)
