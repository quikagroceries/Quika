"""email-or-phone identity, otp channel

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-09-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "phone", existing_type=sa.String(length=20), nullable=True)
    op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("users", "is_email_verified", server_default=None)

    op.alter_column(
        "otp_codes",
        "phone",
        new_column_name="identifier",
        existing_type=sa.String(length=20),
        type_=sa.String(length=255),
    )
    op.add_column("otp_codes", sa.Column("channel", sa.String(length=10), nullable=False, server_default="sms"))
    op.alter_column("otp_codes", "channel", server_default=None)


def downgrade() -> None:
    op.drop_column("otp_codes", "channel")
    op.alter_column(
        "otp_codes",
        "identifier",
        new_column_name="phone",
        existing_type=sa.String(length=255),
        type_=sa.String(length=20),
    )
    op.drop_column("users", "is_email_verified")
    op.alter_column("users", "phone", existing_type=sa.String(length=20), nullable=False)
