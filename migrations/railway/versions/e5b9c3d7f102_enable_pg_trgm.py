"""Enable pg_trgm for fuzzy dog-name matching in search suggestions

/api/search/suggest ranks dog names with similarity() so a typo still finds
the dog (#491). Railway's Postgres already had the extension installed on
2026-09-25; this records it so a fresh database gets it too.

Revision ID: e5b9c3d7f102
Revises: d4a8b2c6e913
Create Date: 2026-09-25 12:00:00.000000

"""

from alembic import op

# revision identifiers
revision = "e5b9c3d7f102"
down_revision = "d4a8b2c6e913"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")


def downgrade() -> None:
    # Left installed: it may predate this migration, as it does on Railway
    pass
