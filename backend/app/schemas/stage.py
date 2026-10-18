import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.candidate import CandidateStage


class StageChangeRequest(BaseModel):
    to_stage: CandidateStage = Field(..., description="Target hiring stage")
    reason: str | None = Field(
        None,
        max_length=1000,
        description="Reason for stage change, required if leaving terminal stage",
    )

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v_trimmed = v.strip()
            return v_trimmed if v_trimmed else None
        return v


class BulkStageChangeRequest(BaseModel):
    candidate_ids: list[uuid.UUID] = Field(
        ..., min_length=1, max_length=100, description="List of candidate UUIDs to move"
    )
    to_stage: CandidateStage = Field(..., description="Target hiring stage")
    reason: str | None = Field(None, max_length=1000, description="Reason for bulk stage transition")

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v_trimmed = v.strip()
            return v_trimmed if v_trimmed else None
        return v


class BulkStageChangeResponse(BaseModel):
    updated_count: int
    to_stage: CandidateStage
    message: str


class StageEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    from_stage: CandidateStage | None = None
    to_stage: CandidateStage
    reason: str | None = None
    changed_by: uuid.UUID
    changer_name: str | None = None
    created_at: datetime
