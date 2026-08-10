"""profile fields + order item quantity

Revision ID: f1a2b3c4d5e6
Revises: 45a2491a71a2
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '45a2491a71a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Both columns are nullable with no server_default needed - existing rows
    # simply have NULL (no profile address / no item quantity yet), which is
    # exactly what those rows should mean.
    op.add_column('users', sa.Column('default_delivery_address', sa.Text(), nullable=True))
    op.add_column('order_items', sa.Column('quantity', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('order_items', 'quantity')
    op.drop_column('users', 'default_delivery_address')
