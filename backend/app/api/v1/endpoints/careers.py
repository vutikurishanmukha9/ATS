import json
import uuid
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_screening_service
from app.models.candidate import Candidate, CandidateSource, CandidateStage
from app.models.stage_event import StageEvent
from app.models.user import User
from app.repositories.candidate_repo import CandidateRepository
from app.repositories.stage_event_repo import StageEventRepository
from app.schemas.screening import ScreeningResult
from app.services.screening import (
    ScreeningService,
    extract_keywords,
    extract_skills_categorized,
    extract_text_from_bytes,
)
from app.services.screening.screening_service import PRESET_JOB_DESCRIPTIONS

router = APIRouter(prefix="/careers", tags=["Career & Student Portal"])

# Schemas
class JobOpening(BaseModel):
    id: str
    title: str
    department: str
    location: str
    employment_type: str
    experience_level: str
    description: str
    required_skills: List[str]
    threshold: float

class StudentApplicationRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    applied_role: str = Field(..., min_length=1, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=1024)
    resume_text: str = Field(..., min_length=1)
    skills: List[str] = Field(default_factory=list)

class StudentTimelineEvent(BaseModel):
    from_stage: Optional[str]
    to_stage: str
    created_at: datetime
    reason: Optional[str]

class StudentApplicationStatus(BaseModel):
    candidate_id: uuid.UUID
    full_name: str
    email: str
    applied_role: str
    current_stage: str
    stage_entered_at: datetime
    created_at: datetime
    match_score: Optional[float]
    skills: List[str]
    timeline: List[StudentTimelineEvent]

JOB_REQUISITIONS: List[JobOpening] = [
    JobOpening(
        id="REQ-2026-001",
        title="Full Stack Developer",
        department="Engineering",
        location="Remote (US / EU / APAC)",
        employment_type="Full-time",
        experience_level="Mid-Senior (3+ years)",
        description=PRESET_JOB_DESCRIPTIONS["Full Stack Developer"]["description"],
        required_skills=["React", "TypeScript", "Node.js", "Python", "FastAPI", "PostgreSQL", "Docker", "Tailwind CSS"],
        threshold=65.0,
    ),
    JobOpening(
        id="REQ-2026-002",
        title="Frontend Developer",
        department="Engineering",
        location="Remote / Hybrid (San Francisco)",
        employment_type="Full-time",
        experience_level="2+ years",
        description=PRESET_JOB_DESCRIPTIONS["Frontend Developer"]["description"],
        required_skills=["React", "TypeScript", "Next.js", "Tailwind CSS", "JavaScript", "HTML5", "CSS3", "Jest"],
        threshold=60.0,
    ),
    JobOpening(
        id="REQ-2026-003",
        title="Backend Developer",
        department="Platform",
        location="Remote (Global)",
        employment_type="Full-time",
        experience_level="3+ years",
        description=PRESET_JOB_DESCRIPTIONS["Backend Developer"]["description"],
        required_skills=["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "SQLAlchemy", "REST APIs", "Microservices"],
        threshold=60.0,
    ),
    JobOpening(
        id="REQ-2026-004",
        title="Data Scientist / AI Engineer",
        department="Data & AI",
        location="Remote / New York, NY",
        employment_type="Full-time",
        experience_level="Mid-Senior (2+ years)",
        description=PRESET_JOB_DESCRIPTIONS["Data Scientist / AI Engineer"]["description"],
        required_skills=["Python", "PyTorch", "NLP", "LLMs", "RAG", "Scikit-learn", "Pandas", "FastAPI", "Vector Databases"],
        threshold=65.0,
    ),
    JobOpening(
        id="REQ-2026-005",
        title="DevOps & Cloud Engineer",
        department="Infrastructure",
        location="Remote / Austin, TX",
        employment_type="Full-time",
        experience_level="3+ years",
        description=PRESET_JOB_DESCRIPTIONS["DevOps & Cloud Engineer"]["description"],
        required_skills=["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "GitHub Actions", "Prometheus"],
        threshold=65.0,
    ),
]


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    department: str = Field(..., min_length=1, max_length=255)
    location: str = Field(..., min_length=1, max_length=255)
    employment_type: str = Field("Full-time", max_length=100)
    experience_level: str = Field("Mid-Level", max_length=100)
    description: str = Field(..., min_length=1)
    required_skills: List[str] = Field(default_factory=list)
    threshold: float = Field(60.0, ge=0.0, le=100.0)


@router.get("/jobs", response_model=List[JobOpening])
async def list_open_jobs() -> List[JobOpening]:
    """Returns all active job requisitions published to the public career board."""
    return JOB_REQUISITIONS


@router.post("/jobs", response_model=JobOpening, status_code=status.HTTP_201_CREATED)
async def create_job_requisition(body: JobCreate) -> JobOpening:
    """Creates a new job requisition and registers it in the screening engine."""
    new_num = len(JOB_REQUISITIONS) + 1
    req_id = f"REQ-2026-{new_num:03d}"
    
    # Auto-extract skills if none provided
    skills = list(body.required_skills)
    if not skills:
        skills = extract_keywords(body.description)[:10]

    new_job = JobOpening(
        id=req_id,
        title=body.title,
        department=body.department,
        location=body.location,
        employment_type=body.employment_type,
        experience_level=body.experience_level,
        description=body.description,
        required_skills=skills,
        threshold=body.threshold,
    )
    JOB_REQUISITIONS.insert(0, new_job)

    # Register into preset descriptions for screening engine
    PRESET_JOB_DESCRIPTIONS[body.title] = {
        "title": body.title,
        "description": body.description,
        "default_threshold": body.threshold,
    }

    return new_job


@router.post("/scan")
async def scan_resume_public(
    file: Optional[UploadFile] = File(None, description="Resume file (PDF or TXT)"),
    resume_text: Optional[str] = Form(None, description="Pasted resume text"),
    role_title: str = Form("Full Stack Developer", description="Target job requisition title"),
) -> ScreeningResult:
    """
    Public 1-click ATS fit scanner for students & applicants.
    Analyzes resume against job requirements, extracts skills, and returns match score and missing skills.
    """
    text = ""
    if file:
        content = await file.read()
        filename = file.filename or "resume.pdf"
        text = extract_text_from_bytes(content, filename)
    elif resume_text:
        text = resume_text.strip()

    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a resume file (PDF/TXT) or paste resume text to scan.",
        )

    # Find matching preset job description
    target_jd = PRESET_JOB_DESCRIPTIONS.get(role_title)
    if not target_jd:
        # Match by partial string
        for title, preset in PRESET_JOB_DESCRIPTIONS.items():
            if role_title.lower() in title.lower() or title.lower() in role_title.lower():
                target_jd = preset
                break
        if not target_jd:
            target_jd = PRESET_JOB_DESCRIPTIONS["Full Stack Developer"]

    result = ScreeningService.evaluate_screening(
        resume_text=text,
        jd_text=target_jd["description"],
        threshold=target_jd.get("default_threshold", 60.0),
    )
    return ScreeningResult(**result)


@router.post("/apply")
async def apply_to_job(
    body: StudentApplicationRequest,
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Student / Candidate self-service job application.
    Submits application, performs automated ATS keyword screening, and tracks in pipeline.
    """
    candidate_repo = CandidateRepository(session)
    event_repo = StageEventRepository(session)

    # Check if candidate already applied
    existing = await candidate_repo.get_by_email(body.email)
    if existing:
        return {
            "status": "existing",
            "message": f"An application under {body.email} is already on file for {existing.applied_role}.",
            "candidate_id": str(existing.id),
            "current_stage": existing.current_stage.value,
            "match_score": existing.match_score,
        }

    # Find a system user/recruiter to associate as created_by
    user_stmt = select(User).limit(1)
    user_result = await session.execute(user_stmt)
    system_user = user_result.scalar_one_or_none()
    if not system_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System configuration error: No recruiter user found.",
        )

    # Look up target job for screening
    target_jd = PRESET_JOB_DESCRIPTIONS.get(body.applied_role)
    if not target_jd:
        for title, preset in PRESET_JOB_DESCRIPTIONS.items():
            if body.applied_role.lower() in title.lower() or title.lower() in body.applied_role.lower():
                target_jd = preset
                break
        if not target_jd:
            target_jd = PRESET_JOB_DESCRIPTIONS["Full Stack Developer"]

    # Run automated keyword screening
    screening_eval = ScreeningService.evaluate_screening(
        resume_text=body.resume_text,
        jd_text=target_jd["description"],
        threshold=target_jd.get("default_threshold", 60.0),
    )

    match_score = screening_eval["score"]
    now = datetime.now(UTC)

    # Determine initial stage:
    # If match score >= 70% -> auto-advance to SCREENING
    # Else -> APPLIED
    initial_stage = CandidateStage.APPLIED
    auto_advanced = False
    if match_score >= 70.0:
        initial_stage = CandidateStage.SCREENING
        auto_advanced = True

    # Extract detected skills from resume if candidate provided empty skills list
    combined_skills = list(body.skills)
    if not combined_skills:
        extracted = extract_skills_categorized(body.resume_text)
        for skill_list in extracted.values():
            combined_skills.extend(skill_list)
        combined_skills = list(dict.fromkeys(combined_skills))[:20]

    candidate = Candidate(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        location=body.location,
        applied_role=body.applied_role,
        source=CandidateSource.CAREER_SITE,
        skills=combined_skills,
        current_stage=initial_stage,
        stage_entered_at=now,
        linkedin_url=body.linkedin_url,
        resume_text=body.resume_text,
        match_score=match_score,
        match_details=json.dumps(screening_eval),
        created_by=system_user.id,
        created_at=now,
        updated_at=now,
    )
    created_candidate = await candidate_repo.create(candidate)

    # Record initial application event
    event1 = StageEvent(
        candidate_id=created_candidate.id,
        from_stage=None,
        to_stage=CandidateStage.APPLIED,
        reason="Self-applied via Student & Career Portal",
        changed_by=system_user.id,
        created_at=now,
    )
    await event_repo.create(event1)

    # If auto-advanced to screening
    if auto_advanced:
        event2 = StageEvent(
            candidate_id=created_candidate.id,
            from_stage=CandidateStage.APPLIED,
            to_stage=CandidateStage.SCREENING,
            reason=f"Automated ATS Keyword Match: {match_score:.1f}% met threshold ({target_jd.get('default_threshold', 60.0)}%) - Auto-advanced to Screening",
            changed_by=system_user.id,
            created_at=now,
        )
        await event_repo.create(event2)

    await session.commit()
    await session.refresh(created_candidate)

    return {
        "status": "success",
        "message": "Application submitted successfully!",
        "candidate_id": str(created_candidate.id),
        "current_stage": created_candidate.current_stage.value,
        "match_score": match_score,
        "auto_advanced": auto_advanced,
        "recommendation": screening_eval["recommendation"],
    }


@router.get("/status", response_model=StudentApplicationStatus)
async def check_application_status(
    email: str = Query(..., description="Student / Candidate email address to check"),
    session: AsyncSession = Depends(get_db),
) -> StudentApplicationStatus:
    """
    Student self-service status tracker.
    Entering student email returns active application, current pipeline stage, and complete timeline.
    """
    candidate_repo = CandidateRepository(session)
    event_repo = StageEventRepository(session)

    candidate = await candidate_repo.get_by_email(email.strip().lower())
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active application found for email: {email}. Please verify or submit a new application.",
        )

    event_rows = await event_repo.list_by_candidate(candidate.id)
    timeline_events = [
        StudentTimelineEvent(
            from_stage=e.from_stage.value if e.from_stage else None,
            to_stage=e.to_stage.value,
            created_at=e.created_at,
            reason=e.reason,
        )
        for e, _ in event_rows
    ]

    return StudentApplicationStatus(
        candidate_id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        applied_role=candidate.applied_role,
        current_stage=candidate.current_stage.value,
        stage_entered_at=candidate.stage_entered_at,
        created_at=candidate.created_at,
        match_score=candidate.match_score,
        skills=candidate.skills or [],
        timeline=timeline_events,
    )
