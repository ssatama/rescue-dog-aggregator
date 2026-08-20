"""Add breed_raw column to animals

Preserves the organization's original breed text, which standardization
previously overwrote in place, making the input unrecoverable.

Revision ID: b3f7c9d1e204
Revises: 45c123f68726
Create Date: 2026-08-20 09:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "b3f7c9d1e204"
down_revision = "45c123f68726"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("animals", sa.Column("breed_raw", sa.String(length=255), nullable=True))

    # Recover the original text for the organizations that happened to keep a
    # copy in properties. The remainder repopulates on the next scrape.
    op.execute(
        """
        UPDATE animals
        SET breed_raw = properties->>'breed'
        WHERE breed_raw IS NULL
          AND properties->>'breed' IS NOT NULL
          AND properties->>'breed' <> ''
        """
    )


def downgrade() -> None:
    op.drop_column("animals", "breed_raw")
