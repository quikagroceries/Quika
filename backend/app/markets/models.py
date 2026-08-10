import uuid

from sqlalchemy import Boolean, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Pickup point for courier quotes. Geocoded once from the market name.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    assigned_market_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    # Whether this agent is currently presenting as an agent at all, vs.
    # switched into customer mode to shop for themselves (see markets.service
    # set_duty). Auto-assignment requires BOTH on_duty and is_available -
    # is_available alone only tracks "not mid-shopping an order", it says
    # nothing about which mode they're in. Defaults True: a freshly
    # promoted/seeded agent starts in their agent view.
    on_duty: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
