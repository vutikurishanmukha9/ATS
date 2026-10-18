import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.candidate import CandidateSource, CandidateStage


class CandidateBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = Field(None, max_length=50)
    location: str | None = Field(None, max_length=255)
    applied_role: str = Field(..., min_length=1, max_length=255)
    source: CandidateSource = CandidateSource.OTHER
    experience_years: float | None = Field(None, ge=0, le=70)
    skills: list[str] = Field(default_factory=list)
    resume_url: str | None = Field(None, max_length=1024)
    linkedin_url: str | None = Field(None, max_length=1024)
    resume_text: str | None = None
    match_score: float | None = None
    match_details: str | None = None

    @field_validator("full_name", "applied_role", mode="before")
    @classmethod
    def trim_text(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("skills", mode="before")
    @classmethod
    def clean_skills(cls, v: object) -> list[str]:
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, str) and item.strip():
                    cleaned.append(item.strip())
            return cleaned
        return []


class CandidateCreate(CandidateBase):
    initial_stage: CandidateStage | None = CandidateStage.APPLIED


class CandidateUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    location: str | None = Field(None, max_length=255)
    applied_role: str | None = Field(None, min_length=1, max_length=255)
    source: CandidateSource | None = None
    experience_years: float | None = Field(None, ge=0, le=70)
    skills: list[str] | None = None
    resume_url: str | None = Field(None, max_length=1024)
    linkedin_url: str | None = Field(None, max_length=1024)
    resume_text: str | None = None
    match_score: float | None = None
    match_details: str | None = None

    @field_validator("full_name", "applied_role", mode="before")
    @classmethod
    def trim_text(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("skills", mode="before")
    @classmethod
    def clean_skills(cls, v: object | None) -> list[str] | None:
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, str) and item.strip():
                    cleaned.append(item.strip())
            return cleaned
        return None


class CandidateRead(CandidateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    current_stage: CandidateStage
    stage_entered_at: datetime
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None


class FacetItem(BaseModel):
    value: str
    count: int


class CandidateFacets(BaseModel):
    roles: list[FacetItem]
    sources: list[FacetItem]
    skills: list[FacetItem]
    stages: list[FacetItem]
