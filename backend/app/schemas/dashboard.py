import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.candidate import CandidateSource, CandidateStage


class DashboardSummary(BaseModel):
    total_candidates: int
    active_pipeline: int
    hired: int
    rejected: int
    new_last_7_days: int
    new_previous_7_days: int
    new_7_days_change: float | None = None
    hire_rate: float | None = None
    median_time_to_hire_days: float | None = None


class DashboardFunnelStage(BaseModel):
    stage: CandidateStage
    count: int
    percentage: float


class DashboardTimeSeriesPoint(BaseModel):
    week_start: str
    week_label: str
    count: int


class DashboardSourceBreakdown(BaseModel):
    source: CandidateSource
    count: int
    percentage: float


class DashboardStageDuration(BaseModel):
    stage: CandidateStage
    avg_days: float | None = None


class DashboardRecentActivity(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    from_stage: CandidateStage | None = None
    to_stage: CandidateStage
    reason: str | None = None
    changed_by: uuid.UUID
    changer_name: str | None = None
    created_at: datetime
