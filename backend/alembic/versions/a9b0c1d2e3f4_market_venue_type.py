"""add market venue_type

Revision ID: a9b0c1d2e3f4
Revises: e1f2a3b4c5d6
Create Date: 2026-08-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "markets",
        sa.Column(
            "venue_type",
            sa.String(length=32),
            nullable=False,
            server_default="local_market",
        ),
    )
    op.create_index("ix_markets_venue_type", "markets", ["venue_type"])


def downgrade() -> None:
    op.drop_index("ix_markets_venue_type", table_name="markets")
    op.drop_column("markets", "venue_type")
