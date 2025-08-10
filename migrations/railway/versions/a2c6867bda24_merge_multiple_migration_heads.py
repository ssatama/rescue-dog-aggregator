"""Merge multiple migration heads

Revision ID: a2c6867bda24
Revises: 1ee0012e8be1, 3084c0c376a2, fc7e8f00d870
Create Date: 2025-08-09 19:35:40.066180

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "a2c6867bda24"
down_revision = ("1ee0012e8be1", "3084c0c376a2", "fc7e8f00d870")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
