from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.dashboard_repo import DashboardRepository
from app.repositories.stage_event_repo import StageEventRepository
from app.schemas.dashboard import (
    DashboardFunnelStage,
    DashboardRecentActivity,
    DashboardSourceBreakdown,
    DashboardStageDuration,
    DashboardSummary,
    DashboardTimeSeriesPoint,
)


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.dashboard_repo = DashboardRepository(session)
        self.event_repo = StageEventRepository(session)

    async def get_summary(self) -> DashboardSummary:
        return await self.dashboard_repo.get_summary()

    async def get_funnel(self) -> list[DashboardFunnelStage]:
        return await self.dashboard_repo.get_funnel()

    async def get_applications_timeseries(self, weeks: int = 12) -> list[DashboardTimeSeriesPoint]:
        return await self.dashboard_repo.get_applications_timeseries(weeks=weeks)

    async def get_sources(self) -> list[DashboardSourceBreakdown]:
        return await self.dashboard_repo.get_sources_breakdown()

    async def get_stage_durations(self) -> list[DashboardStageDuration]:
        return await self.dashboard_repo.get_average_stage_durations()

    async def get_recent_activity(self, limit: int = 10) -> list[DashboardRecentActivity]:
        events = await self.event_repo.list_recent(limit=limit)
        results: list[DashboardRecentActivity] = []
        for event, candidate_name, changer_name in events:
            results.append(
                DashboardRecentActivity(
                    id=event.id,
                    candidate_id=event.candidate_id,
                    candidate_name=candidate_name,
                    from_stage=event.from_stage,
                    to_stage=event.to_stage,
                    reason=event.reason,
                    changed_by=event.changed_by,
                    changer_name=changer_name,
                    created_at=event.created_at,
                )
            )
        return results
