import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AgentRating(Base):
    """Customer feedback on the agent who shopped an order (#7) - 1-5 stars
    plus an optional comment. Feedback only: never read by assignment
    (orders.assignment) or agent pay (orders.fees) - see ratings.service for
    the one-per-completed-order enforcement.
    """

    __tablename__ = "agent_ratings"
    __table_args__ = (UniqueConstraint("order_id", name="uq_agent_ratings_order_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    # Loose references (no FK), same convention as Order.agent_id/customer_id.
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))

    stars: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
