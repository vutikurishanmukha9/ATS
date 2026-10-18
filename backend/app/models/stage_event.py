import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.candidate import CandidateStage


class StageEvent(Base):
    __tablename__ = "stage_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_stage: Mapped[CandidateStage | None] = mapped_column(
        SAEnum(CandidateStage, name="candidate_stage_enum", native_enum=False),
        nullable=True,
    )
    to_stage: Mapped[CandidateStage] = mapped_column(
        SAEnum(CandidateStage, name="candidate_stage_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    # Relationships
    candidate = relationship("Candidate", back_populates="stage_events")
    changer = relationship("User", back_populates="stage_events")
