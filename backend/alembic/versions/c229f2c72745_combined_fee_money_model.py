"""combined fee money model

Revision ID: c229f2c72745
Revises: 4b6d4d8a8551
Create Date: 2026-07-26 15:42:06.177205

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c229f2c72745'
down_revision: Union[str, None] = '4b6d4d8a8551'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table already has rows, so the new NOT NULL columns need a server_default
    # to backfill them, then we drop the default so the schema matches the
    # model exactly (which only declares a Python-side default).
    op.add_column('orders', sa.Column('combined_fee', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('company_share', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('agent_share', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('emtl_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('transfer_fees_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'))
    op.alter_column('orders', 'combined_fee', server_default=None)
    op.alter_column('orders', 'company_share', server_default=None)
    op.alter_column('orders', 'agent_share', server_default=None)
    op.alter_column('orders', 'emtl_total', server_default=None)
    op.alter_column('orders', 'transfer_fees_total', server_default=None)
    op.drop_column('orders', 'service_charge')
    op.drop_column('orders', 'agent_fee')


def downgrade() -> None:
    op.add_column('orders', sa.Column('agent_fee', sa.NUMERIC(precision=12, scale=2), autoincrement=False, nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('service_charge', sa.NUMERIC(precision=12, scale=2), autoincrement=False, nullable=False, server_default='0'))
    op.alter_column('orders', 'agent_fee', server_default=None)
    op.alter_column('orders', 'service_charge', server_default=None)
    op.drop_column('orders', 'transfer_fees_total')
    op.drop_column('orders', 'emtl_total')
    op.drop_column('orders', 'agent_share')
    op.drop_column('orders', 'company_share')
    op.drop_column('orders', 'combined_fee')
