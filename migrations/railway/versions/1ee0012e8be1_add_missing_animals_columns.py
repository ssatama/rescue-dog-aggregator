"""Add missing animals columns

Revision ID: 1ee0012e8be1
Revises: a05b40da5dd1
Create Date: 2025-07-14 10:00:45.548639

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "1ee0012e8be1"
down_revision = "a05b40da5dd1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to animals table to match local schema
    op.add_column("animals", sa.Column("active", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("animals", sa.Column("last_session_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove the added columns
    op.drop_column("animals", "last_session_id")
    op.drop_column("animals", "active")
