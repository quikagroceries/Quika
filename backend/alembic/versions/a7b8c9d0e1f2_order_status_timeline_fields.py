"""order status timeline fields (agent_assigned_at, packed_at, dispatched_at, delivered_at, handover_code)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('agent_assigned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('packed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('orders', sa.Column('handover_code', sa.String(length=8), nullable=True))

    # Best-effort backfill for orders that already exist: without this, any
    # order created before this migration would show its status timeline
    # permanently stuck at "Agent assigned" (or wherever the first newly
    # nullable field falls), even though it's long since moved on. Real
    # timestamps were never recorded for these, so this approximates from
    # whatever's already known, staged so each column can COALESCE off the
    # one before it - keeping the chronological invariant
    # (agent_assigned_at <= paid_at <= packed_at <= dispatched_at <=
    # delivered_at) intact even in backfilled data.
    op.execute(
        "UPDATE orders SET agent_assigned_at = created_at "
        "WHERE agent_id IS NOT NULL AND agent_assigned_at IS NULL"
    )
    op.execute(
        "UPDATE orders SET packed_at = COALESCE(paid_at, created_at) "
        "WHERE status IN ('PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED') "
        "AND packed_at IS NULL"
    )
    op.execute(
        "UPDATE orders SET dispatched_at = COALESCE(packed_at, paid_at, created_at) "
        "WHERE status IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED') "
        "AND dispatched_at IS NULL"
    )
    op.execute(
        "UPDATE orders SET delivered_at = COALESCE(dispatched_at, packed_at, paid_at, created_at) "
        "WHERE status IN ('DELIVERED', 'CLOSED') "
        "AND delivered_at IS NULL"
    )


def downgrade() -> None:
    op.drop_column('orders', 'handover_code')
    op.drop_column('orders', 'delivered_at')
    op.drop_column('orders', 'dispatched_at')
    op.drop_column('orders', 'packed_at')
    op.drop_column('orders', 'agent_assigned_at')
