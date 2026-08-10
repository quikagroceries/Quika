"""order_item per-item overage fields (#5)

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd0e1f2a3b4c5'
down_revision: Union[str, None] = 'c9d0e1f2a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('order_items', sa.Column('overage_requested_price', sa.Numeric(12, 2), nullable=True))
    op.add_column('order_items', sa.Column('overage_requested_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('order_items', sa.Column('overage_decision', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('order_items', 'overage_decision')
    op.drop_column('order_items', 'overage_requested_at')
    op.drop_column('order_items', 'overage_requested_price')
