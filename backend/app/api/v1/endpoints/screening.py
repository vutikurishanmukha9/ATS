import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, UploadFile, status

from app.api.deps import get_current_user, get_screening_service
from app.models.user import User
from app.schemas.screening import (
    BatchScreenRequest,
    BatchScreenResponse,
    EvaluateScreeningRequest,
    PresetJobDescription,
    ScreenCandidateRequest,
    ScreeningResult,
    TextExtractionResponse,
)
from app.services.screening import (
    ScreeningService,
    extract_keywords,
    extract_skills_categorized,
    extract_text_from_bytes,
)

router = APIRouter(prefix="/screening", tags=["Keyword Screening"])


@router.get("/presets", response_model=List[PresetJobDescription])
async def get_preset_job_descriptions(
    current_user: User = Depends(get_current_user),
) -> List[PresetJobDescription]:
    """Returns curated preset job descriptions for popular roles."""
    return ScreeningService.get_presets()


@router.post("/extract", response_model=TextExtractionResponse)
async def extract_resume_file(
    file: UploadFile = File(..., description="PDF or TXT resume file to parse"),
    current_user: User = Depends(get_current_user),
) -> TextExtractionResponse:
    """Parses an uploaded PDF or TXT resume file and extracts text, technical keywords, and skills."""
    content = await file.read()
    filename = file.filename or "resume.pdf"
    extracted_text = extract_text_from_bytes(content, filename)

    keywords = extract_keywords(extracted_text)
    skills = extract_skills_categorized(extracted_text)

    return TextExtractionResponse(
        filename=filename,
        text=extracted_text,
        extracted_keywords=keywords[:30],
        categorized_skills=skills,
    )


@router.post("/evaluate", response_model=ScreeningResult)
async def evaluate_resume_screening(
    data: EvaluateScreeningRequest,
    current_user: User = Depends(get_current_user),
) -> ScreeningResult:
    """Evaluates raw resume text against a job description, computing keyword match and decision."""
    result = ScreeningService.evaluate_screening(
        resume_text=data.resume_text,
        jd_text=data.job_description,
        threshold=data.threshold,
        required_keywords=data.required_keywords,
    )
    return ScreeningResult(**result)


@router.post("/candidate/{candidate_id}", response_model=ScreeningResult)
async def screen_candidate_by_id(
    candidate_id: uuid.UUID,
    data: ScreenCandidateRequest,
    current_user: User = Depends(get_current_user),
    screening_service: ScreeningService = Depends(get_screening_service),
) -> ScreeningResult:
    """
    Evaluates candidate against JD, stores match score in database, and
    optionally transitions stage to 'screening' (Accept) or 'rejected' (Reject).
    """
    # If custom resume text provided, we can update it first
    if data.custom_resume_text:
        candidate = await screening_service.candidate_repo.get_by_id(candidate_id)
        if candidate:
            candidate.resume_text = data.custom_resume_text
            await screening_service.session.commit()

    result = await screening_service.screen_candidate(
        candidate_id=candidate_id,
        user_id=current_user.id,
        jd_text=data.job_description,
        threshold=data.threshold,
        auto_apply=data.auto_apply,
    )
    return ScreeningResult(**result)


@router.post("/batch", response_model=BatchScreenResponse)
async def batch_screen_candidates(
    data: BatchScreenRequest,
    current_user: User = Depends(get_current_user),
    screening_service: ScreeningService = Depends(get_screening_service),
) -> BatchScreenResponse:
    """
    Batch screens multiple candidates against a job description.
    If auto_apply is True, candidates are moved to 'screening' or 'rejected' automatically.
    """
    result = await screening_service.batch_screen_candidates(
        candidate_ids=data.candidate_ids,
        user_id=current_user.id,
        jd_text=data.job_description,
        threshold=data.threshold,
        auto_apply=data.auto_apply,
    )
    return BatchScreenResponse(**result)
