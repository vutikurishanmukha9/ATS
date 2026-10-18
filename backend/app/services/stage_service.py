import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.models.candidate import CandidateStage
from app.models.stage_event import StageEvent
from app.repositories.candidate_repo import CandidateRepository
from app.repositories.stage_event_repo import StageEventRepository
from app.schemas.candidate import CandidateRead
from app.schemas.stage import BulkStageChangeResponse, StageEventRead

TERMINAL_STAGES = {CandidateStage.HIRED, CandidateStage.REJECTED}


class StageService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.candidate_repo = CandidateRepository(session)
        self.event_repo = StageEventRepository(session)

    async def change_stage(
        self,
        candidate_id: uuid.UUID,
        to_stage: CandidateStage,
        user_id: uuid.UUID,
        reason: str | None = None,
    ) -> CandidateRead:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        from_stage = candidate.current_stage

        # Rule 1: A move to the same stage is rejected with 422
        if from_stage == to_stage:
            raise ValidationException(f"Candidate is already in stage: {to_stage.value}")

        # Rule 2: Leaving a terminal stage requires a reason
        if from_stage in TERMINAL_STAGES and not (reason and reason.strip()):
            raise ValidationException(
                f"A reason is required when transitioning out of terminal stage '{from_stage.value}'"
            )

        now = datetime.now(UTC)
        candidate.current_stage = to_stage
        candidate.stage_entered_at = now
        candidate.updated_at = now

        # Append stage event in the same transaction
        event = StageEvent(
            candidate_id=candidate.id,
            from_stage=from_stage,
            to_stage=to_stage,
            reason=reason.strip() if reason else None,
            changed_by=user_id,
            created_at=now,
        )
        await self.event_repo.create(event)
        await self.session.commit()
        await self.session.refresh(candidate)

        return CandidateRead.model_validate(candidate)

    async def bulk_change_stage(
        self,
        candidate_ids: list[uuid.UUID],
        to_stage: CandidateStage,
        user_id: uuid.UUID,
        reason: str | None = None,
    ) -> BulkStageChangeResponse:
        """
        Atomically changes stage for multiple candidates.
        If any candidate fails validation or is already in target stage, entire operation rolls back.
        """
        if not candidate_ids:
            raise ValidationException("candidate_ids list cannot be empty")

        candidates = await self.candidate_repo.get_by_ids(candidate_ids)
        if len(candidates) != len(candidate_ids):
            found_ids = {c.id for c in candidates}
            missing = [str(cid) for cid in candidate_ids if cid not in found_ids]
            raise NotFoundException(f"Some candidates were not found: {', '.join(missing)}")

        try:
            # Pass 1: Validate all candidates BEFORE making any changes
            for candidate in candidates:
                from_stage = candidate.current_stage

                if from_stage == to_stage:
                    raise ValidationException(
                        f"Candidate {candidate.full_name} ({candidate.id}) is already in stage: {to_stage.value}"
                    )

                if from_stage in TERMINAL_STAGES and not (reason and reason.strip()):
                    raise ValidationException(
                        f"A reason is required to move candidate {candidate.full_name} out of terminal stage '{from_stage.value}'"
                    )

            # Pass 2: Mutate and create events only after all validations pass
            now = datetime.now(UTC)
            events_to_create = []
            for candidate in candidates:
                from_stage = candidate.current_stage
                candidate.current_stage = to_stage
                candidate.stage_entered_at = now
                candidate.updated_at = now

                event = StageEvent(
                    candidate_id=candidate.id,
                    from_stage=from_stage,
                    to_stage=to_stage,
                    reason=reason.strip() if reason else None,
                    changed_by=user_id,
                    created_at=now,
                )
                events_to_create.append(event)

            for ev in events_to_create:
                await self.event_repo.create(ev)

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return BulkStageChangeResponse(
            updated_count=len(candidates),
            to_stage=to_stage,
            message=f"Successfully moved {len(candidates)} candidates to {to_stage.value}",
        )

    async def get_candidate_events(self, candidate_id: uuid.UUID) -> list[StageEventRead]:
        candidate = await self.candidate_repo.get_by_id(candidate_id)
        if not candidate:
            raise NotFoundException("Candidate not found")

        events_with_names = await self.event_repo.list_by_candidate(candidate_id)
        results: list[StageEventRead] = []
        for event, changer_name in events_with_names:
            read_model = StageEventRead(
                id=event.id,
                candidate_id=event.candidate_id,
                from_stage=event.from_stage,
                to_stage=event.to_stage,
                reason=event.reason,
                changed_by=event.changed_by,
                changer_name=changer_name,
                created_at=event.created_at,
            )
            results.append(read_model)
        return results
