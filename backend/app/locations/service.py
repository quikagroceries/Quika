import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.locations.models import LocationSearch


async def record_location_search(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    label: str,
    latitude: float | None,
    longitude: float | None,
) -> None:
    db.add(
        LocationSearch(
            user_id=user_id,
            label=label,
            latitude=latitude,
            longitude=longitude,
        )
    )
    await db.flush()


async def get_popular_locations(db: AsyncSession, *, limit: int = 8) -> list[dict]:
    """Most-searched labels, newest coordinates for each (func.max on
    latitude/longitude is just "any representative pair for this label",
    not a meaningful max - labels are searched with the same coordinates
    each time in practice).
    """
    count_col = func.count(LocationSearch.id).label("count")
    result = await db.execute(
        select(
            LocationSearch.label,
            count_col,
            func.max(LocationSearch.latitude).label("latitude"),
            func.max(LocationSearch.longitude).label("longitude"),
        )
        .group_by(LocationSearch.label)
        .order_by(count_col.desc())
        .limit(limit)
    )
    return [
        {"label": row.label, "count": row.count, "latitude": row.latitude, "longitude": row.longitude}
        for row in result.all()
    ]
