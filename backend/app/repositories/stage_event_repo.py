import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate
from app.models.stage_event import StageEvent
from app.models.user import User


class StageEventRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, event: StageEvent) -> StageEvent:
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def list_by_candidate(self, candidate_id: uuid.UUID) -> list[tuple[StageEvent, str | None]]:
        """Returns candidate stage events with changer's full name, sorted newest first."""
        stmt = (
            select(StageEvent, User.full_name)
            .outerjoin(User, StageEvent.changed_by == User.id)
            .where(StageEvent.candidate_id == candidate_id)
            .order_by(desc(StageEvent.created_at))
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def list_recent(self, limit: int = 10) -> list[tuple[StageEvent, str, str | None]]:
        """Returns recent stage events across candidates with candidate name and changer name."""
        stmt = (
            select(StageEvent, Candidate.full_name, User.full_name)
            .join(Candidate, StageEvent.candidate_id == Candidate.id)
            .outerjoin(User, StageEvent.changed_by == User.id)
            .where(Candidate.deleted_at.is_(None))
            .order_by(desc(StageEvent.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.all())
