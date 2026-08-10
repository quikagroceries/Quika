"""add float_ledger seq primary key

Revision ID: 2a1f2d7acb6b
Revises: 75ab55b7d2cc
Create Date: 2026-07-20 14:31:37.987052

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2a1f2d7acb6b'
down_revision: Union[str, None] = '75ab55b7d2cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # autogenerate detects new columns but not primary-key swaps, so this is
    # hand-written: seq becomes the new PK (autoincrementing identity), id
    # stays as a unique-indexed column instead of the PK.
    op.add_column(
        'float_ledger',
        sa.Column('seq', sa.BigInteger(), sa.Identity(), nullable=False),
    )
    op.create_index(op.f('ix_float_ledger_id'), 'float_ledger', ['id'], unique=True)
    op.drop_constraint('float_ledger_pkey', 'float_ledger', type_='primary')
    op.create_primary_key('float_ledger_pkey', 'float_ledger', ['seq'])


def downgrade() -> None:
    op.drop_constraint('float_ledger_pkey', 'float_ledger', type_='primary')
    op.create_primary_key('float_ledger_pkey', 'float_ledger', ['id'])
    op.drop_index(op.f('ix_float_ledger_id'), table_name='float_ledger')
    op.drop_column('float_ledger', 'seq')
