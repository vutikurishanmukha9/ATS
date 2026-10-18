from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user, get_dashboard_service
from app.models.user import User
from app.schemas.dashboard import (
    DashboardFunnelStage,
    DashboardRecentActivity,
    DashboardSourceBreakdown,
    DashboardStageDuration,
    DashboardSummary,
    DashboardTimeSeriesPoint,
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    """Returns high-level metric cards including pipeline totals and hire rate."""
    return await dashboard_service.get_summary()


@router.get("/funnel", response_model=list[DashboardFunnelStage])
async def get_dashboard_funnel(
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardFunnelStage]:
    """Returns candidate distribution across all 7 stages for the Pipeline Strip."""
    return await dashboard_service.get_funnel()


@router.get("/applications-timeseries", response_model=list[DashboardTimeSeriesPoint])
async def get_applications_timeseries(
    weeks: int = Query(12, ge=1, le=52, description="Number of weeks to query"),
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardTimeSeriesPoint]:
    """Returns weekly application trend."""
    return await dashboard_service.get_applications_timeseries(weeks=weeks)


@router.get("/sources", response_model=list[DashboardSourceBreakdown])
async def get_sources_breakdown(
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardSourceBreakdown]:
    """Returns candidate acquisition source percentages."""
    return await dashboard_service.get_sources()


@router.get("/stage-durations", response_model=list[DashboardStageDuration])
async def get_stage_durations(
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardStageDuration]:
    """Returns average duration in days spent in each hiring stage."""
    return await dashboard_service.get_stage_durations()


@router.get("/recent-activity", response_model=list[DashboardRecentActivity])
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=50, description="Max activities to return"),
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardRecentActivity]:
    """Returns recent candidate stage movements."""
    return await dashboard_service.get_recent_activity(limit=limit)
