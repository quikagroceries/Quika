"""seller geotag

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sellers", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("sellers", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("sellers", "longitude")
    op.drop_column("sellers", "latitude")
