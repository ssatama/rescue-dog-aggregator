"""Add slug column to animals

Revision ID: 3084c0c376a2
Revises: 7fed20e4b664
Create Date: 2025-07-25 20:43:26.873788

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "3084c0c376a2"
down_revision = "7fed20e4b664"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add slug column to animals table as nullable first
    op.add_column("animals", sa.Column("slug", sa.String(), nullable=True))

    # Update existing records with proper slug values based on animal names and breeds
    # This handles existing animals in Railway using the same logic as local database
    op.execute(
        """
        UPDATE animals 
        SET slug = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g')) || 
                   CASE 
                       WHEN breed IS NOT NULL THEN '-' || LOWER(REGEXP_REPLACE(TRIM(breed), '[^a-zA-Z0-9]+', '-', 'g'))
                       ELSE ''
                   END ||
                   '-' || id::TEXT
        WHERE slug IS NULL OR slug = ''
    """
    )

    # Make the column NOT NULL after populating values
    op.alter_column("animals", "slug", nullable=False)

    # Create unique index on slug after values are populated
    op.create_index("idx_animals_slug", "animals", ["slug"], unique=True)


def downgrade() -> None:
    # Remove unique index and slug column
    op.drop_index("idx_animals_slug", table_name="animals")
    op.drop_column("animals", "slug")
