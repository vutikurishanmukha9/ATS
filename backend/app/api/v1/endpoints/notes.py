import uuid

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_note_service
from app.models.user import User
from app.schemas.note import NoteRead, NoteUpdate
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: uuid.UUID,
    body: NoteUpdate,
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service),
) -> NoteRead:
    """Updates an existing note (restricted to author)."""
    return await note_service.update_note(note_id, current_user.id, body)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service),
) -> None:
    """Deletes a note (restricted to author)."""
    await note_service.delete_note(note_id, current_user.id)
