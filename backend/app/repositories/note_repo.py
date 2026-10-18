import uuid
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.models.user import User


class NoteRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, note: Note) -> Note:
        self.session.add(note)
        await self.session.flush()
        await self.session.refresh(note)
        return note

    async def get_by_id(self, note_id: uuid.UUID) -> Note | None:
        stmt = select(Note).where(Note.id == note_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_candidate(self, candidate_id: uuid.UUID) -> list[tuple[Note, str | None]]:
        """Returns notes for candidate joined with author's name, sorted newest first."""
        stmt = (
            select(Note, User.full_name)
            .outerjoin(User, Note.author_id == User.id)
            .where(Note.candidate_id == candidate_id)
            .order_by(desc(Note.created_at))
        )
        result = await self.session.execute(stmt)
        return list(result.all())

    async def update(self, note_id: uuid.UUID, body: str) -> Note | None:
        note = await self.get_by_id(note_id)
        if not note:
            return None
        note.body = body
        note.updated_at = datetime.now(UTC)
        await self.session.flush()
        await self.session.refresh(note)
        return note

    async def delete(self, note_id: uuid.UUID) -> bool:
        note = await self.get_by_id(note_id)
        if not note:
            return False
        await self.session.delete(note)
        await self.session.flush()
        return True
