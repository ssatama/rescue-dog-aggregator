"""Store breed_confidence as a number

The column was VARCHAR, so comparisons and ordering were lexical: as text
"0.85" sorts above "0.9", which makes any threshold filter silently wrong.
Every existing value is already numeric text, so the cast is lossless.

Revision ID: c7d2e4f81a35
Revises: b3f7c9d1e204
Create Date: 2026-08-20 15:40:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "c7d2e4f81a35"
down_revision = "b3f7c9d1e204"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE animals
        ALTER COLUMN breed_confidence TYPE NUMERIC(3, 2)
        USING NULLIF(breed_confidence, '')::NUMERIC
        """
    )


def downgrade() -> None:
    op.alter_column(
        "animals",
        "breed_confidence",
        type_=sa.String(length=50),
        postgresql_using="breed_confidence::text",
    )
