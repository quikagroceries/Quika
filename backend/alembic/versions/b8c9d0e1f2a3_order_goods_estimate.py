"""order goods_estimate (cap composition fix)

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column('goods_estimate', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
    )
    op.alter_column('orders', 'goods_estimate', server_default=None)

    # Best-effort backfill for existing orders: the real listed_items_total
    # at creation time was never stored anywhere, so this reverse-derives it
    # from estimated_value the same way the frontend's pre-fix preview did
    # (estimated_value = goods + DELIVERY_FEE_FLAT + COMBINED_BASE_FEE, per
    # app/orders/fees.py). Only touches rows that still have an unset
    # (0.00) goods_estimate and a real estimate to derive from.
    op.execute(
        "UPDATE orders SET goods_estimate = GREATEST(estimated_value - 3600.00 - 2000.00, 0.00) "
        "WHERE goods_estimate = 0.00 AND estimated_value > 0.00"
    )

    # Any authorization already created under the OLD (combined-estimate)
    # cap is corrected to match, so the fix actually closes the leak on
    # live/in-progress orders too, not just future ones.
    op.execute(
        "UPDATE spending_authorizations SET cap = orders.goods_estimate "
        "FROM orders "
        "WHERE spending_authorizations.order_id = orders.id "
        "AND spending_authorizations.cap != orders.goods_estimate"
    )


def downgrade() -> None:
    op.drop_column('orders', 'goods_estimate')
