"""002_add_screening_fields

Revision ID: 002_add_screening_fields
Revises: 001_initial_schema
Create Date: 2026-10-17 18:30:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "002_add_screening_fields"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("resume_text", sa.Text(), nullable=True))
    op.add_column("candidates", sa.Column("match_score", sa.Float(), nullable=True))
    op.add_column("candidates", sa.Column("match_details", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "match_details")
    op.drop_column("candidates", "match_score")
    op.drop_column("candidates", "resume_text")
