import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NoteCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000, description="Note content")

    @field_validator("body", mode="before")
    @classmethod
    def trim_body(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class NoteUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000, description="Updated note content")

    @field_validator("body", mode="before")
    @classmethod
    def trim_body(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str | None = None
    body: str
    created_at: datetime
    updated_at: datetime
