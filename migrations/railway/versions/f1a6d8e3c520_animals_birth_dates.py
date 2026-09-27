"""Add birth-date range and age_observed_at to animals

Ages froze at first sight: every org skips existing dogs, so age_min_months
and age_max_months were computed once and never changed (#561). A dog's age
is now stored as the range of birth dates that fits what the rescue said, and
the month columns are derived from it (utils/birth_dates.py).

The columns start empty. The backfill step `derive-birth-dates` (#572) fills
them for stored dogs; until then the refresh leaves those rows alone.

Revision ID: f1a6d8e3c520
Revises: e5b9c3d7f102
Create Date: 2026-09-26 21:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "f1a6d8e3c520"
down_revision = "e5b9c3d7f102"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("animals", sa.Column("birth_date_min", sa.Date(), nullable=True))
    op.add_column("animals", sa.Column("birth_date_max", sa.Date(), nullable=True))
    op.add_column("animals", sa.Column("age_observed_at", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("animals", "age_observed_at")
    op.drop_column("animals", "birth_date_max")
    op.drop_column("animals", "birth_date_min")
