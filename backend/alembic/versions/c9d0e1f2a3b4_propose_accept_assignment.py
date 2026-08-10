"""propose->accept assignment (proposed_agent_id, rejected_agent_ids, PROPOSED status)

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c9d0e1f2a3b4'
down_revision: Union[str, None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('proposed_agent_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('orders', sa.Column('rejected_agent_ids', sa.JSON(), nullable=True))
    # New enum member for the order_status Postgres type. Must not be used
    # in the same transaction it's added in (fine here - nothing else in
    # this migration touches the `status` column).
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PROPOSED' BEFORE 'AGENT_ASSIGNED'")


def downgrade() -> None:
    # Postgres has no ALTER TYPE ... DROP VALUE - removing an enum member
    # requires rebuilding the type, which isn't worth it for a downgrade
    # path. Columns are safely reversible; the enum member is left in place.
    op.drop_column('orders', 'rejected_agent_ids')
    op.drop_column('orders', 'proposed_agent_id')
