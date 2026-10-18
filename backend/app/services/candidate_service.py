import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.candidate import Candidate, CandidateSource, CandidateStage
from app.models.stage_event import StageEvent
from app.repositories.candidate_repo import CandidateRepository
from app.repositories.stage_event_repo import StageEventRepository
from app.schemas.candidate import (
    CandidateCreate,
    CandidateFacets,
    CandidateRead,
    CandidateUpdate,
)


class CandidateService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.candidate_repo = CandidateRepository(session)
        self.event_repo = StageEventRepository(session)

    async def get_candidate(self, candidate_id: uuid.UUID) -> CandidateRead:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")
        return CandidateRead.model_validate(candidate)

    async def create_candidate(self, data: CandidateCreate, user_id: uuid.UUID) -> CandidateRead:
        # Check duplicate email
        existing = await self.candidate_repo.get_by_email(data.email)
        if existing:
            raise ConflictException(
                "A candidate with this email already exists",
                details={"existing_candidate_id": str(existing.id)},
            )

        now = datetime.now(UTC)
        initial_stage = data.initial_stage or CandidateStage.APPLIED

        candidate = Candidate(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            location=data.location,
            applied_role=data.applied_role,
            source=data.source,
            experience_years=data.experience_years,
            skills=data.skills,
            current_stage=initial_stage,
            stage_entered_at=now,
            resume_url=data.resume_url,
            linkedin_url=data.linkedin_url,
            resume_text=data.resume_text,
            match_score=data.match_score,
            match_details=data.match_details,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        created_candidate = await self.candidate_repo.create(candidate)

        # Record initial stage event in the same transaction
        initial_event = StageEvent(
            candidate_id=created_candidate.id,
            from_stage=None,
            to_stage=initial_stage,
            reason="Initial application created",
            changed_by=user_id,
            created_at=now,
        )
        await self.event_repo.create(initial_event)
        await self.session.commit()
        await self.session.refresh(created_candidate)

        return CandidateRead.model_validate(created_candidate)

    async def update_candidate(self, candidate_id: uuid.UUID, data: CandidateUpdate) -> CandidateRead:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        if data.email and data.email.lower() != candidate.email.lower():
            existing = await self.candidate_repo.get_by_email(data.email)
            if existing and existing.id != candidate.id:
                raise ConflictException(
                    "A candidate with this email already exists",
                    details={"existing_candidate_id": str(existing.id)},
                )
            candidate.email = data.email

        update_dict = data.model_dump(exclude_unset=True)
        update_dict.pop("email", None)

        for key, value in update_dict.items():
            if value is not None:
                setattr(candidate, key, value)

        candidate.updated_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(candidate)

        return CandidateRead.model_validate(candidate)

    async def delete_candidate(self, candidate_id: uuid.UUID) -> bool:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        candidate.deleted_at = datetime.now(UTC)
        await self.session.commit()
        return True

    async def list_candidates(
        self,
        q: str | None = None,
        stages: list[CandidateStage] | None = None,
        sources: list[CandidateSource] | None = None,
        role: str | None = None,
        skills: list[str] | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[CandidateRead], int]:
        items, total = await self.candidate_repo.list_candidates(
            q=q,
            stages=stages,
            sources=sources,
            role=role,
            skills=skills,
            created_from=created_from,
            created_to=created_to,
            sort=sort,
            order=order,
            page=page,
            page_size=page_size,
        )
        read_items = [CandidateRead.model_validate(c) for c in items]
        return read_items, total

    async def get_facets(self) -> CandidateFacets:
        data = await self.candidate_repo.get_facets()
        return CandidateFacets.model_validate(data)
