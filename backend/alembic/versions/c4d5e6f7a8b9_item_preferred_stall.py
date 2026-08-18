"""order item preferred stall

Revision ID: c4d5e6f7a8b9
Revises: a9b0c1d2e3f4
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "a9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "order_items",
        sa.Column(
            "preferred_stall_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_order_items_preferred_stall_id", "order_items", ["preferred_stall_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_order_items_preferred_stall_id", table_name="order_items")
    op.drop_column("order_items", "preferred_stall_id")
