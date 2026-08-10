"""messages order_id cascade delete

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A pre-shopping order (draft/agent_assigned) can now be deleted by its
    # customer (see orders.service.delete_order). Chat is allowed at any
    # point in an order's life, so messages can already exist on a
    # pre-shopping order - without ON DELETE CASCADE here, deleting such an
    # order would fail on the FK instead of cleanly removing its chat too.
    op.drop_constraint('messages_order_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_order_id_fkey', 'messages', 'orders',
        ['order_id'], ['id'], ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('messages_order_id_fkey', 'messages', type_='foreignkey')
    op.create_foreign_key(
        'messages_order_id_fkey', 'messages', 'orders',
        ['order_id'], ['id'],
    )
