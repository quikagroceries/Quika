"""add wallet_ledger seq primary key

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Same fix as 2a1f2d7acb6b did for float_ledger: created_at alone isn't a
    # reliable "newest first" ordering key when two movements land in the
    # same instant, so seq becomes the new PK (autoincrementing identity);
    # id stays as a unique-indexed column instead of the PK.
    op.add_column(
        'wallet_ledger',
        sa.Column('seq', sa.BigInteger(), sa.Identity(), nullable=False),
    )
    op.create_index(op.f('ix_wallet_ledger_id'), 'wallet_ledger', ['id'], unique=True)
    op.drop_constraint('wallet_ledger_pkey', 'wallet_ledger', type_='primary')
    op.create_primary_key('wallet_ledger_pkey', 'wallet_ledger', ['seq'])


def downgrade() -> None:
    op.drop_constraint('wallet_ledger_pkey', 'wallet_ledger', type_='primary')
    op.create_primary_key('wallet_ledger_pkey', 'wallet_ledger', ['id'])
    op.drop_index(op.f('ix_wallet_ledger_id'), table_name='wallet_ledger')
    op.drop_column('wallet_ledger', 'seq')
