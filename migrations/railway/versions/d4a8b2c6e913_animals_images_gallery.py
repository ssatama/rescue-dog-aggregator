"""Store photo galleries in animals.images; drop animal_images

Scrapers kept only the hero photo although most rescues publish several per
dog. The gallery lives on the animals row as JSONB, in the rescue's order:
[{"url": <R2 url>, "original_url": ..., "width": ..., "height": ...}].
NULL means the dog has not been scraped since this column existed.

animal_images was created for the same purpose, never written to or read,
and holds 0 rows, so it goes.

Revision ID: d4a8b2c6e913
Revises: c7d2e4f81a35
Create Date: 2026-09-24 20:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "d4a8b2c6e913"
down_revision = "c7d2e4f81a35"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("animals", sa.Column("images", postgresql.JSONB(), nullable=True))
    op.execute("DROP TABLE IF EXISTS animal_images CASCADE;")


def downgrade() -> None:
    op.drop_column("animals", "images")
    # animal_images is not recreated: it never held data and nothing uses it
