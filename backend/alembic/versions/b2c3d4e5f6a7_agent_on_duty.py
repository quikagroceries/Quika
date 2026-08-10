"""agent on_duty flag

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # agents already has rows, so the new NOT NULL column needs a
    # server_default to backfill them (existing agents start on-duty, i.e.
    # in their normal agent view), then we drop the default so the schema
    # matches the model exactly (which only declares a Python-side default).
    op.add_column('agents', sa.Column('on_duty', sa.Boolean(), nullable=False, server_default='true'))
    op.alter_column('agents', 'on_duty', server_default=None)
    op.create_index(op.f('ix_agents_on_duty'), 'agents', ['on_duty'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_agents_on_duty'), table_name='agents')
    op.drop_column('agents', 'on_duty')
