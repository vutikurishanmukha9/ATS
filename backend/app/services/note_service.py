import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.note import Note
from app.repositories.candidate_repo import CandidateRepository
from app.repositories.note_repo import NoteRepository
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate


class NoteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.note_repo = NoteRepository(session)
        self.candidate_repo = CandidateRepository(session)

    async def create_note(self, candidate_id: uuid.UUID, author_id: uuid.UUID, data: NoteCreate) -> NoteRead:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        note = Note(candidate_id=candidate_id, author_id=author_id, body=data.body)
        created_note = await self.note_repo.create(note)
        await self.session.commit()
        await self.session.refresh(created_note)

        # Retrieve with author name
        notes_with_author = await self.note_repo.list_by_candidate(candidate_id)
        for n, author_name in notes_with_author:
            if n.id == created_note.id:
                return NoteRead(
                    id=n.id,
                    candidate_id=n.candidate_id,
                    author_id=n.author_id,
                    author_name=author_name,
                    body=n.body,
                    created_at=n.created_at,
                    updated_at=n.updated_at,
                )

        return NoteRead.model_validate(created_note)

    async def list_notes(self, candidate_id: uuid.UUID) -> list[NoteRead]:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        notes_with_author = await self.note_repo.list_by_candidate(candidate_id)
        return [
            NoteRead(
                id=n.id,
                candidate_id=n.candidate_id,
                author_id=n.author_id,
                author_name=author_name,
                body=n.body,
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n, author_name in notes_with_author
        ]

    async def update_note(self, note_id: uuid.UUID, user_id: uuid.UUID, data: NoteUpdate) -> NoteRead:
        note = await self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundException("Note not found")

        if note.author_id != user_id:
            raise ForbiddenException("You can only edit notes that you authored")

        updated = await self.note_repo.update(note_id, data.body)
        await self.session.commit()
        await self.session.refresh(updated)

        notes_with_author = await self.note_repo.list_by_candidate(updated.candidate_id)
        for n, author_name in notes_with_author:
            if n.id == updated.id:
                return NoteRead(
                    id=n.id,
                    candidate_id=n.candidate_id,
                    author_id=n.author_id,
                    author_name=author_name,
                    body=n.body,
                    created_at=n.created_at,
                    updated_at=n.updated_at,
                )

        return NoteRead.model_validate(updated)

    async def delete_note(self, note_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        note = await self.note_repo.get_by_id(note_id)
        if not note:
            raise NotFoundException("Note not found")

        if note.author_id != user_id:
            raise ForbiddenException("You can only delete notes that you authored")

        deleted = await self.note_repo.delete(note_id)
        await self.session.commit()
        return deleted
