import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import ApplicationKind, ApplicationStatus


class AgentApplication(Base):
    """A request to become an agent (for a market) or a rider (for an area).

    Two ways in: a signed-in customer applying from Settings (user_id set),
    or anyone applying from the public For Agents / For Riders pages with
    just a name and phone - no account needed (user_id stays None until
    approval finds or creates the account for that phone).

    Nobody is promoted unilaterally by an admin — they apply, and an admin
    approves or rejects. Agent approval reuses admin.service.promote_to_agent
    so the actual role/Agent-record change happens in exactly one place.
    """

    __tablename__ = "agent_applications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    kind: Mapped[ApplicationKind] = mapped_column(
        Enum(ApplicationKind), default=ApplicationKind.AGENT, server_default="AGENT", index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True, nullable=True)
    # Snapshot of who applied - always set, so the admin screen never has to
    # look up (or wait for) an account to show a name and number to call.
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    # Required for agents (the market they'll shop); optional for riders.
    market_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # Riders only: free-text area they'd cover and what they ride.
    area: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vehicle: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.PENDING, index=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
