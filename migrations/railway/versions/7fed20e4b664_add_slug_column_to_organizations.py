"""Add slug column to organizations

Revision ID: 7fed20e4b664
Revises: 1ee0012e8be1
Create Date: 2025-07-25 20:36:40.345657

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "7fed20e4b664"
down_revision = "1ee0012e8be1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add slug column to organizations table as nullable first
    op.add_column("organizations", sa.Column("slug", sa.String(), nullable=True))

    # Update existing records with proper slug values based on organization names
    # This handles the 8 existing organizations in Railway
    op.execute(
        """
        UPDATE organizations 
        SET slug = CASE 
            WHEN name ILIKE '%turkey%' THEN 'pets-turkey'
            WHEN name ILIKE '%istanbul%' THEN 'istanbul-patiler'
            WHEN name ILIKE '%ankara%' THEN 'ankara-hayvan-derneği'
            WHEN name ILIKE '%antalya%' THEN 'antalya-hayvan-derneği'
            WHEN name ILIKE '%izmir%' THEN 'izmir-sokak-hayvanlari'
            WHEN name ILIKE '%bursa%' THEN 'bursa-pati-derneği'
            WHEN name ILIKE '%eskişehir%' THEN 'eskişehir-hayvan-koruma'
            WHEN name ILIKE '%mersin%' THEN 'mersin-sokak-hayvanlari'
            ELSE LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'))
        END
        WHERE slug IS NULL OR slug = ''
    """
    )

    # Make the column NOT NULL after populating values
    op.alter_column("organizations", "slug", nullable=False)

    # Create unique index on slug after values are populated
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)


def downgrade() -> None:
    # Remove unique index and slug column
    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_column("organizations", "slug")
