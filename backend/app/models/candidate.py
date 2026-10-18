import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TextArrayType


class CandidateStage(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    TECHNICAL = "technical"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class CandidateSource(str, enum.Enum):
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    JOB_BOARD = "job_board"
    CAREER_SITE = "career_site"
    AGENCY = "agency"
    OTHER = "other"


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    applied_role: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source: Mapped[CandidateSource] = mapped_column(
        SAEnum(CandidateSource, name="candidate_source_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    experience_years: Mapped[float | None] = mapped_column(Float, nullable=True)
    skills: Mapped[list[str]] = mapped_column(TextArrayType, nullable=False, default=list)
    current_stage: Mapped[CandidateStage] = mapped_column(
        SAEnum(CandidateStage, name="candidate_stage_enum", native_enum=False),
        default=CandidateStage.APPLIED,
        nullable=False,
        index=True,
    )
    stage_entered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    resume_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    creator = relationship("User", back_populates="created_candidates", foreign_keys=[created_by])
    stage_events = relationship(
        "StageEvent",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="StageEvent.created_at.desc()",
    )
    notes = relationship(
        "Note",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="Note.created_at.desc()",
    )

    __table_args__ = (
        Index("ix_candidates_stage_created", "current_stage", "created_at"),
        Index("ix_candidates_active_deleted", "deleted_at", "current_stage"),
    )
