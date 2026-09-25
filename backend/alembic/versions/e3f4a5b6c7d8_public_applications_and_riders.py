"""public agent/rider applications (no account needed) and the riders roster

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

application_kind = postgresql.ENUM('AGENT', 'RIDER', name='applicationkind')
rider_status = postgresql.ENUM('ACTIVE', 'SUSPENDED', name='riderstatus')


def upgrade() -> None:
    application_kind.create(op.get_bind(), checkfirst=True)
    rider_status.create(op.get_bind(), checkfirst=True)

    op.add_column('agent_applications', sa.Column(
        'kind', postgresql.ENUM(name='applicationkind', create_type=False),
        nullable=False, server_default='AGENT',
    ))
    op.add_column('agent_applications', sa.Column('full_name', sa.String(length=120), nullable=True))
    op.add_column('agent_applications', sa.Column('phone', sa.String(length=20), nullable=True))
    op.add_column('agent_applications', sa.Column('area', sa.String(length=200), nullable=True))
    op.add_column('agent_applications', sa.Column('vehicle', sa.String(length=60), nullable=True))
    op.alter_column('agent_applications', 'user_id', nullable=True)
    op.alter_column('agent_applications', 'market_id', nullable=True)
    op.create_index(op.f('ix_agent_applications_kind'), 'agent_applications', ['kind'], unique=False)
    op.create_index(op.f('ix_agent_applications_phone'), 'agent_applications', ['phone'], unique=False)
    # Existing (in-app) applications: snapshot the applicant's name/phone.
    op.execute(
        "UPDATE agent_applications a SET full_name = u.full_name, phone = u.phone "
        "FROM users u WHERE u.id = a.user_id"
    )

    op.create_table(
        'riders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('area', sa.String(length=200), nullable=True),
        sa.Column('vehicle', sa.String(length=60), nullable=True),
        sa.Column('market_id', sa.UUID(), nullable=True),
        sa.Column('status', postgresql.ENUM(name='riderstatus', create_type=False), nullable=False),
        sa.Column('application_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_riders_phone'), 'riders', ['phone'], unique=True)
    op.create_index(op.f('ix_riders_status'), 'riders', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_riders_status'), table_name='riders')
    op.drop_index(op.f('ix_riders_phone'), table_name='riders')
    op.drop_table('riders')
    op.execute("DELETE FROM agent_applications WHERE user_id IS NULL OR kind = 'RIDER'")
    op.drop_index(op.f('ix_agent_applications_phone'), table_name='agent_applications')
    op.drop_index(op.f('ix_agent_applications_kind'), table_name='agent_applications')
    op.alter_column('agent_applications', 'market_id', nullable=False)
    op.alter_column('agent_applications', 'user_id', nullable=False)
    op.drop_column('agent_applications', 'vehicle')
    op.drop_column('agent_applications', 'area')
    op.drop_column('agent_applications', 'phone')
    op.drop_column('agent_applications', 'full_name')
    op.drop_column('agent_applications', 'kind')
    rider_status.drop(op.get_bind(), checkfirst=True)
    application_kind.drop(op.get_bind(), checkfirst=True)
