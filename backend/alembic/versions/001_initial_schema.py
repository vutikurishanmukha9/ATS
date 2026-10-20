"""001_initial_schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-17 12:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. candidates
    skills_col = postgresql.ARRAY(sa.String()) if is_postgres else sa.Text()

    op.create_table(
        "candidates",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("applied_role", sa.String(255), nullable=False),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("experience_years", sa.Float(), nullable=True),
        sa.Column("skills", skills_col, nullable=False),
        sa.Column("current_stage", sa.String(50), nullable=False),
        sa.Column("stage_entered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resume_url", sa.String(1024), nullable=True),
        sa.Column("linkedin_url", sa.String(1024), nullable=True),
        sa.Column(
            "created_by",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_candidates_email", "candidates", ["email"], unique=True)
    op.create_index("ix_candidates_applied_role", "candidates", ["applied_role"])
    op.create_index("ix_candidates_source", "candidates", ["source"])
    op.create_index("ix_candidates_current_stage", "candidates", ["current_stage"])
    op.create_index("ix_candidates_created_at", "candidates", ["created_at"])
    op.create_index("ix_candidates_deleted_at", "candidates", ["deleted_at"])
    op.create_index("ix_candidates_stage_created", "candidates", ["current_stage", "created_at"])
    op.create_index("ix_candidates_active_deleted", "candidates", ["deleted_at", "current_stage"])

    if is_postgres:
        # GIN index on skills
        op.execute("CREATE INDEX ix_candidates_skills_gin ON candidates USING gin (skills);")
        # pg_trgm GIN indexes for fast partial matching
        op.execute("CREATE INDEX ix_candidates_name_trgm ON candidates USING gin (full_name gin_trgm_ops);")
        op.execute("CREATE INDEX ix_candidates_email_trgm ON candidates USING gin (email gin_trgm_ops);")
        # Full-text search tsvector column, trigger & GIN index
        op.execute("ALTER TABLE candidates ADD COLUMN search_vector tsvector;")
        op.execute("""
            CREATE OR REPLACE FUNCTION candidates_search_vector_trigger() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := to_tsvector('english',
                    coalesce(NEW.full_name, '') || ' ' ||
                    coalesce(NEW.email, '') || ' ' ||
                    coalesce(NEW.applied_role, '') || ' ' ||
                    coalesce(array_to_string(NEW.skills, ' '), '')
                );
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        """)
        op.execute("""
            CREATE TRIGGER trg_candidates_search_vector
            BEFORE INSERT OR UPDATE ON candidates
            FOR EACH ROW EXECUTE FUNCTION candidates_search_vector_trigger();
        """)
        op.execute("CREATE INDEX ix_candidates_search_vector ON candidates USING gin (search_vector);")

    # 3. stage_events
    op.create_table(
        "stage_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "candidate_id",
            sa.UUID(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_stage", sa.String(50), nullable=True),
        sa.Column("to_stage", sa.String(50), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=True),
        sa.Column(
            "changed_by",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_stage_events_candidate_id", "stage_events", ["candidate_id"])
    op.create_index("ix_stage_events_to_stage", "stage_events", ["to_stage"])
    op.create_index("ix_stage_events_created_at", "stage_events", ["created_at"])

    # 4. notes
    op.create_table(
        "notes",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "candidate_id",
            sa.UUID(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notes_candidate_id", "notes", ["candidate_id"])
    op.create_index("ix_notes_author_id", "notes", ["author_id"])
    op.create_index("ix_notes_created_at", "notes", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_candidates_search_vector ON candidates;")
        op.execute("DROP FUNCTION IF EXISTS candidates_search_vector_trigger();")
    op.drop_table("notes")
    op.drop_table("stage_events")
    op.drop_table("candidates")
    op.drop_table("users")
