import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PresetJobDescription(BaseModel):
    role: str
    title: str
    description: str
    default_threshold: float


class EvaluateScreeningRequest(BaseModel):
    resume_text: str = Field(..., min_length=1, description="Candidate resume text to evaluate")
    job_description: str = Field(..., min_length=1, description="Target job description with requirements")
    threshold: float = Field(60.0, ge=0.0, le=100.0, description="Minimum match percentage required for acceptance")
    required_keywords: Optional[List[str]] = Field(None, description="Explicit list of must-have keywords")


class ScreenCandidateRequest(BaseModel):
    job_description: str = Field(..., min_length=1, description="Job description text to screen against")
    threshold: float = Field(60.0, ge=0.0, le=100.0, description="Acceptance threshold percentage (0-100)")
    auto_apply: bool = Field(False, description="Automatically transition candidate to screening or rejected")
    custom_resume_text: Optional[str] = Field(None, description="Optional custom resume text override")


class BatchScreenRequest(BaseModel):
    candidate_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of candidate UUIDs to screen")
    job_description: str = Field(..., min_length=1, description="Target job description for screening")
    threshold: float = Field(60.0, ge=0.0, le=100.0, description="Minimum acceptance score threshold (0-100)")
    auto_apply: bool = Field(False, description="If True, automatically moves candidates to Screening or Rejected")


class ScreeningResult(BaseModel):
    score: float
    threshold: float
    decision: str  # "ACCEPT" or "REJECT"
    is_accepted: bool
    recommendation: str
    summary_reason: str
    matched_keywords: List[str]
    missing_keywords: Dict[str, List[str]]
    categorized_skills: Dict[str, List[str]]
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    current_stage: Optional[str] = None
    auto_applied_stage: Optional[str] = None
    breakdown: Optional[Dict[str, int]] = None
    critical_matched: Optional[List[str]] = None
    critical_missing: Optional[List[str]] = None
    important_matched: Optional[List[str]] = None
    important_missing: Optional[List[str]] = None
    achievements_detected: Optional[List[Dict[str, Any]]] = None
    suggestions: Optional[List[Dict[str, Any]]] = None


class BatchScreenResponse(BaseModel):
    total_screened: int
    accepted_count: int
    rejected_count: int
    threshold: float
    auto_applied: bool
    results: List[Dict[str, Any]]


class TextExtractionResponse(BaseModel):
    filename: str
    text: str
    extracted_keywords: List[str]
    categorized_skills: Dict[str, List[str]]
