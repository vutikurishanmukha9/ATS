import csv
import io
import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_candidate_service,
    get_current_user,
    get_db,
    get_note_service,
    get_stage_service,
)
from app.models.candidate import CandidateSource, CandidateStage
from app.models.stage_event import StageEvent
from app.models.user import User
from app.repositories.candidate_repo import CandidateRepository
from app.repositories.stage_event_repo import StageEventRepository
from app.schemas.candidate import (
    CandidateCreate,
    CandidateFacets,
    CandidateRead,
    CandidateUpdate,
)
from app.schemas.common import PaginatedResponse
from app.schemas.note import NoteCreate, NoteRead
from app.schemas.stage import (
    BulkStageChangeRequest,
    BulkStageChangeResponse,
    StageChangeRequest,
    StageEventRead,
)
from app.services.candidate_service import CandidateService
from app.services.note_service import NoteService
from app.services.stage_service import StageService

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.get("", response_model=PaginatedResponse[CandidateRead])
async def list_candidates(
    q: str | None = Query(None, description="Search query across name, email, role, and skills"),
    stage: list[CandidateStage] | None = Query(None, description="Filter by candidate stage"),
    source: list[CandidateSource] | None = Query(None, description="Filter by candidate source"),
    role: str | None = Query(None, description="Filter by applied role"),
    skills: list[str] | None = Query(None, description="Filter by skills"),
    created_from: datetime | None = Query(None, description="Created on or after date"),
    created_to: datetime | None = Query(None, description="Created on or before date"),
    sort: str = Query("created_at", description="Field to sort by"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Page size (capped at 100)"),
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> PaginatedResponse[CandidateRead]:
    """Retrieves paginated, filtered, and full-text ranked candidates."""
    items, total = await candidate_service.list_candidates(
        q=q,
        stages=stage,
        sources=source,
        role=role,
        skills=skills,
        created_from=created_from,
        created_to=created_to,
        sort=sort,
        order=order,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=CandidateRead, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    data: CandidateCreate,
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> CandidateRead:
    """Creates a new candidate and appends initial stage event atomically."""
    return await candidate_service.create_candidate(data, current_user.id)


@router.get("/export/csv")
async def export_candidates_csv(
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> Response:
    """Exports all candidate pipeline records into an enterprise CSV spreadsheet."""
    items, _ = await candidate_service.list_candidates(page=1, page_size=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Full Name", "Email", "Phone", "Location", "Applied Role", "Stage", "Source", "Match Score (%)", "Applied Date"])
    for c in items:
        writer.writerow([
            str(c.id),
            c.full_name,
            c.email,
            c.phone or "",
            c.location or "",
            c.applied_role,
            c.current_stage.value,
            c.source.value,
            f"{c.match_score:.1f}" if c.match_score is not None else "N/A",
            c.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crack_it_candidates_pipeline.csv"},
    )


@router.get("/facets", response_model=CandidateFacets)
async def get_facets(
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> CandidateFacets:
    """Returns available filter options and counts for roles, sources, and skills."""
    return await candidate_service.get_facets()


@router.post("/bulk/stage", response_model=BulkStageChangeResponse)
async def bulk_change_stage(
    body: BulkStageChangeRequest,
    current_user: User = Depends(get_current_user),
    stage_service: StageService = Depends(get_stage_service),
) -> BulkStageChangeResponse:
    """Atomically transitions multiple candidates to a target stage."""
    return await stage_service.bulk_change_stage(
        candidate_ids=body.candidate_ids,
        to_stage=body.to_stage,
        user_id=current_user.id,
        reason=body.reason,
    )


@router.get("/{candidate_id}", response_model=CandidateRead)
async def get_candidate(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> CandidateRead:
    """Returns single candidate by UUID."""
    return await candidate_service.get_candidate(candidate_id)


@router.patch("/{candidate_id}", response_model=CandidateRead)
async def update_candidate(
    candidate_id: uuid.UUID,
    data: CandidateUpdate,
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> CandidateRead:
    """Updates candidate profile details."""
    return await candidate_service.update_candidate(candidate_id, data)


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    candidate_service: CandidateService = Depends(get_candidate_service),
) -> None:
    """Soft deletes candidate."""
    await candidate_service.delete_candidate(candidate_id)


@router.post("/{candidate_id}/stage", response_model=CandidateRead)
async def change_stage(
    candidate_id: uuid.UUID,
    body: StageChangeRequest,
    current_user: User = Depends(get_current_user),
    stage_service: StageService = Depends(get_stage_service),
) -> CandidateRead:
    """Transitions a candidate to a new hiring stage, appending audit record."""
    return await stage_service.change_stage(
        candidate_id=candidate_id,
        to_stage=body.to_stage,
        user_id=current_user.id,
        reason=body.reason,
    )


@router.get("/{candidate_id}/events", response_model=list[StageEventRead])
async def list_candidate_events(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    stage_service: StageService = Depends(get_stage_service),
) -> list[StageEventRead]:
    """Returns chronological stage transitions and reason log."""
    return await stage_service.get_candidate_events(candidate_id)


@router.get("/{candidate_id}/notes", response_model=list[NoteRead])
async def list_candidate_notes(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service),
) -> list[NoteRead]:
    """Lists all notes attached to candidate."""
    return await note_service.list_notes(candidate_id)


@router.post(
    "/{candidate_id}/notes",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_candidate_note(
    candidate_id: uuid.UUID,
    body: NoteCreate,
    current_user: User = Depends(get_current_user),
    note_service: NoteService = Depends(get_note_service),
) -> NoteRead:
    """Adds a new note to candidate."""
    return await note_service.create_note(candidate_id=candidate_id, author_id=current_user.id, data=body)


# ==================== INTERVIEW & OFFER SCHEMAS ====================

class ScheduleInterviewPayload(BaseModel):
    round_type: str = Field("Technical Round 1", description="Round name or type")
    title: str = Field("Technical Architecture & Coding", description="Interview title")
    interviewer_name: str = Field(..., description="Name of interviewer")
    interviewer_email: str = Field(..., description="Email of interviewer")
    scheduled_at: str = Field(..., description="Date and time of interview")
    duration_minutes: int = Field(45, description="Duration in minutes")
    meeting_link: str = Field("https://meet.google.com/enterprise-ats", description="Meeting room URL")


class UpdateInterviewPayload(BaseModel):
    status: str = Field("completed", description="scheduled, completed, cancelled")
    rating: int | None = Field(None, ge=1, le=5, description="1 to 5 star rating")
    scorecard_notes: str | None = Field(None, description="Scorecard evaluation feedback")


class OfferPackagePayload(BaseModel):
    base_salary: float = Field(..., description="Annual base salary")
    bonus_percentage: float = Field(10.0, description="Annual target bonus %")
    equity_shares: int = Field(1000, description="Stock options / RSUs")
    currency: str = Field("USD", description="Currency symbol/code")
    start_date: str = Field("2026-11-01", description="Target start date")
    expiration_date: str = Field("2026-10-31", description="Offer expiry date")
    notes: str | None = Field(None, description="Additional compensation terms")


# ==================== INTERVIEW & OFFER ENDPOINTS ====================

@router.get("/{candidate_id}/interviews")
async def list_candidate_interviews(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all scheduled and completed interview rounds for candidate."""
    repo = CandidateRepository(db)
    cand = await repo.get_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    details = {}
    if cand.match_details:
        try:
            details = json.loads(cand.match_details)
        except Exception:
            details = {}
    return details.get("interviews", [])


@router.post("/{candidate_id}/interviews", status_code=status.HTTP_201_CREATED)
async def schedule_candidate_interview(
    candidate_id: uuid.UUID,
    body: ScheduleInterviewPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedules a new interview round and logs event to candidate audit history."""
    repo = CandidateRepository(db)
    cand = await repo.get_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    details = {}
    if cand.match_details:
        try:
            details = json.loads(cand.match_details)
        except Exception:
            details = {}

    interviews = details.get("interviews", [])
    new_interview = {
        "id": str(uuid.uuid4()),
        "round_type": body.round_type,
        "title": body.title,
        "interviewer_name": body.interviewer_name,
        "interviewer_email": body.interviewer_email,
        "scheduled_at": body.scheduled_at,
        "duration_minutes": body.duration_minutes,
        "meeting_link": body.meeting_link,
        "status": "scheduled",
        "rating": None,
        "scorecard_notes": None,
        "created_at": datetime.now(UTC).isoformat(),
    }
    interviews.append(new_interview)
    details["interviews"] = interviews
    cand.match_details = json.dumps(details)

    # Log to StageEvent audit trail
    event_repo = StageEventRepository(db)
    event = StageEvent(
        candidate_id=cand.id,
        from_stage=cand.current_stage,
        to_stage=cand.current_stage,
        reason=f"Scheduled {body.round_type} with {body.interviewer_name} ({body.scheduled_at})",
        changed_by=current_user.id,
        created_at=datetime.now(UTC),
    )
    await event_repo.create(event)
    await db.commit()

    return new_interview


@router.patch("/{candidate_id}/interviews/{interview_id}")
async def update_candidate_interview(
    candidate_id: uuid.UUID,
    interview_id: str,
    body: UpdateInterviewPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates interview status and records evaluation scorecard."""
    repo = CandidateRepository(db)
    cand = await repo.get_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    details = {}
    if cand.match_details:
        try:
            details = json.loads(cand.match_details)
        except Exception:
            details = {}

    interviews = details.get("interviews", [])
    matched_interview = None
    for item in interviews:
        if item.get("id") == interview_id:
            item["status"] = body.status
            if body.rating is not None:
                item["rating"] = body.rating
            if body.scorecard_notes is not None:
                item["scorecard_notes"] = body.scorecard_notes
            matched_interview = item
            break

    if not matched_interview:
        raise HTTPException(status_code=404, detail="Interview round not found")

    details["interviews"] = interviews
    cand.match_details = json.dumps(details)

    # Log completion audit event
    if body.status == "completed":
        event_repo = StageEventRepository(db)
        rating_str = f"Score: {body.rating}/5" if body.rating else "Evaluated"
        event = StageEvent(
            candidate_id=cand.id,
            from_stage=cand.current_stage,
            to_stage=cand.current_stage,
            reason=f"Completed {matched_interview.get('round_type')} ({rating_str}): {body.scorecard_notes or 'Scorecard logged'}",
            changed_by=current_user.id,
            created_at=datetime.now(UTC),
        )
        await event_repo.create(event)

    await db.commit()
    return matched_interview


@router.get("/{candidate_id}/offer")
async def get_candidate_offer(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves candidate compensation offer details and generated formal offer letter."""
    repo = CandidateRepository(db)
    cand = await repo.get_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    details = {}
    if cand.match_details:
        try:
            details = json.loads(cand.match_details)
        except Exception:
            details = {}

    return details.get("offer")


@router.post("/{candidate_id}/offer")
async def create_candidate_offer(
    candidate_id: uuid.UUID,
    body: OfferPackagePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creates or updates candidate formal offer package and generates offer letter markdown."""
    repo = CandidateRepository(db)
    cand = await repo.get_by_id(candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    details = {}
    if cand.match_details:
        try:
            details = json.loads(cand.match_details)
        except Exception:
            details = {}

    # Generate formal markdown offer letter
    letter = f"""# FORMAL OFFER OF EMPLOYMENT
**Crack it Enterprise Technologies Inc.**
Date: {datetime.now(UTC).strftime('%B %d, %Y')}

Dear **{cand.full_name}**,

On behalf of Crack it, we are thrilled to extend an official offer of employment for the position of **{cand.applied_role}**.

### Compensation & Benefits Summary
* **Base Salary**: {body.currency} {body.base_salary:,.2f} per annum, payable in regular semi-monthly installments.
* **Annual Performance Bonus**: Target of {body.bonus_percentage}% of annual base salary based on company and individual performance milestones.
* **Equity / Stock Grants**: {body.equity_shares:,} restricted stock units subject to our standard 4-year vesting schedule with a 1-year cliff.
* **Target Start Date**: {body.start_date}
* **Offer Expiration Date**: {body.expiration_date}

### Health, Welfare & Time Off
You will be eligible to participate in Crack it comprehensive benefits programs including Medical, Dental, Vision, 401(k) / Provident Fund matching, and Unlimited Flexible Time Off (FTO).

### Acceptance
To accept this offer, please countersign electronically by {body.expiration_date}.

Sincerely,
**Talent Acquisition Team**
Crack it Enterprise Technologies Inc.
"""

    offer_data = {
        "base_salary": body.base_salary,
        "bonus_percentage": body.bonus_percentage,
        "equity_shares": body.equity_shares,
        "currency": body.currency,
        "start_date": body.start_date,
        "expiration_date": body.expiration_date,
        "notes": body.notes,
        "letter_markdown": letter,
        "created_at": datetime.now(UTC).isoformat(),
        "status": "approved",
    }

    details["offer"] = offer_data
    cand.match_details = json.dumps(details)

    # Log to StageEvent audit trail
    event_repo = StageEventRepository(db)
    event = StageEvent(
        candidate_id=cand.id,
        from_stage=cand.current_stage,
        to_stage=CandidateStage.OFFER if cand.current_stage != CandidateStage.OFFER else cand.current_stage,
        reason=f"Generated Formal Offer Package: {body.currency} {body.base_salary:,.0f} base + {body.bonus_percentage}% bonus",
        changed_by=current_user.id,
        created_at=datetime.now(UTC),
    )
    if cand.current_stage != CandidateStage.OFFER:
        cand.current_stage = CandidateStage.OFFER
        cand.stage_entered_at = datetime.now(UTC)

    await event_repo.create(event)
    await db.commit()

    return offer_data
