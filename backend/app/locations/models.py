import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LocationSearch(Base):
    """One row per location a user picked (header/search location picker or
    the "choose a market" flow) - the raw log that popular-areas aggregates
    from. Not deduped on write; `label` is grouped/counted in service.py.
    """

    __tablename__ = "location_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Loose reference (no FK), same convention as ratings/orders - guests
    # (get_current_user_optional) leave this null.
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    # Display text as picked, e.g. "Lekki Phase 1, Lagos" - the grouping key
    # for popularity counts.
    label: Mapped[str] = mapped_column(String(255), index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
