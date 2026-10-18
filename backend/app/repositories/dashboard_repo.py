import statistics
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate, CandidateStage
from app.models.stage_event import StageEvent
from app.schemas.dashboard import (
    DashboardFunnelStage,
    DashboardSourceBreakdown,
    DashboardStageDuration,
    DashboardSummary,
    DashboardTimeSeriesPoint,
)


class DashboardRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_summary(self) -> DashboardSummary:
        now = datetime.now(UTC)
        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)

        base_where = Candidate.deleted_at.is_(None)

        # Total, Active, Hired, Rejected, 7d and prev 7d counts
        stmt = select(
            func.count(Candidate.id).label("total"),
            func.count(
                case(
                    (
                        Candidate.current_stage.notin_([CandidateStage.HIRED, CandidateStage.REJECTED]),
                        1,
                    ),
                    else_=None,
                )
            ).label("active"),
            func.count(case((Candidate.current_stage == CandidateStage.HIRED, 1), else_=None)).label("hired"),
            func.count(case((Candidate.current_stage == CandidateStage.REJECTED, 1), else_=None)).label("rejected"),
            func.count(case((Candidate.created_at >= seven_days_ago, 1), else_=None)).label("new_7d"),
            func.count(
                case(
                    (
                        and_(
                            Candidate.created_at >= fourteen_days_ago,
                            Candidate.created_at < seven_days_ago,
                        ),
                        1,
                    ),
                    else_=None,
                )
            ).label("new_prev_7d"),
        ).where(base_where)

        res = await self.session.execute(stmt)
        row = res.one()

        total = row.total or 0
        active = row.active or 0
        hired = row.hired or 0
        rejected = row.rejected or 0
        new_7d = row.new_7d or 0
        new_prev_7d = row.new_prev_7d or 0

        # Hire rate: hired / (hired + rejected), null when no candidate decided
        decided = hired + rejected
        hire_rate = (hired / decided) if decided > 0 else None

        # 7-day change percentage
        change_pct: float | None = None
        if new_prev_7d > 0:
            change_pct = round(((new_7d - new_prev_7d) / new_prev_7d) * 100.0, 1)
        elif new_7d > 0:
            change_pct = 100.0
        else:
            change_pct = None

        # Median time to hire in days (from created_at to stage_entered_at of hired candidates)
        hired_times_stmt = (
            select(Candidate.created_at, Candidate.stage_entered_at)
            .where(base_where)
            .where(Candidate.current_stage == CandidateStage.HIRED)
        )
        hired_res = await self.session.execute(hired_times_stmt)
        hire_durations: list[float] = []
        for c_created, c_entered in hired_res.all():
            if c_created and c_entered and c_entered >= c_created:
                diff_days = (c_entered - c_created).total_seconds() / 86400.0
                hire_durations.append(diff_days)

        median_time_to_hire: float | None = None
        if hire_durations:
            median_time_to_hire = round(statistics.median(hire_durations), 1)

        return DashboardSummary(
            total_candidates=total,
            active_pipeline=active,
            hired=hired,
            rejected=rejected,
            new_last_7_days=new_7d,
            new_previous_7_days=new_prev_7d,
            new_7_days_change=change_pct,
            hire_rate=round(hire_rate * 100, 1) if hire_rate is not None else None,
            median_time_to_hire_days=median_time_to_hire,
        )

    async def get_funnel(self) -> list[DashboardFunnelStage]:
        """Returns candidate distribution across all 7 stages."""
        base_where = Candidate.deleted_at.is_(None)

        stmt = (
            select(Candidate.current_stage, func.count(Candidate.id))
            .where(base_where)
            .group_by(Candidate.current_stage)
        )
        res = await self.session.execute(stmt)
        counts = {s[0]: s[1] for s in res.all()}

        total_stmt = select(func.count(Candidate.id)).where(base_where)
        total_res = await self.session.execute(total_stmt)
        total = total_res.scalar_one() or 0

        stages_order = [
            CandidateStage.APPLIED,
            CandidateStage.SCREENING,
            CandidateStage.INTERVIEW,
            CandidateStage.TECHNICAL,
            CandidateStage.OFFER,
            CandidateStage.HIRED,
            CandidateStage.REJECTED,
        ]

        funnel: list[DashboardFunnelStage] = []
        for stage in stages_order:
            cnt = counts.get(stage, 0)
            pct = round((cnt / total) * 100.0, 1) if total > 0 else 0.0
            funnel.append(DashboardFunnelStage(stage=stage, count=cnt, percentage=pct))

        return funnel

    async def get_applications_timeseries(self, weeks: int = 12) -> list[DashboardTimeSeriesPoint]:
        """Returns weekly candidate counts for the specified number of trailing weeks."""
        now = datetime.now(UTC)
        # Determine start of current week (Monday)
        current_monday = now.date() - timedelta(days=now.weekday())

        points: list[DashboardTimeSeriesPoint] = []
        for i in range(weeks - 1, -1, -1):
            week_start_date = current_monday - timedelta(weeks=i)
            week_end_date = week_start_date + timedelta(days=7)

            start_dt = datetime(
                week_start_date.year,
                week_start_date.month,
                week_start_date.day,
                tzinfo=UTC,
            )
            end_dt = datetime(week_end_date.year, week_end_date.month, week_end_date.day, tzinfo=UTC)

            stmt = select(func.count(Candidate.id)).where(
                and_(
                    Candidate.deleted_at.is_(None),
                    Candidate.created_at >= start_dt,
                    Candidate.created_at < end_dt,
                )
            )
            res = await self.session.execute(stmt)
            count = res.scalar_one() or 0

            # Label like "Oct 12"
            label = week_start_date.strftime("%b %d")
            points.append(
                DashboardTimeSeriesPoint(
                    week_start=week_start_date.isoformat(),
                    week_label=label,
                    count=count,
                )
            )

        return points

    async def get_sources_breakdown(self) -> list[DashboardSourceBreakdown]:
        """Computes percentage breakdown per candidate source."""
        base_where = Candidate.deleted_at.is_(None)

        stmt = (
            select(Candidate.source, func.count(Candidate.id))
            .where(base_where)
            .group_by(Candidate.source)
            .order_by(func.count(Candidate.id).desc())
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        total = sum(r[1] for r in rows)

        breakdown: list[DashboardSourceBreakdown] = []
        for source, cnt in rows:
            pct = round((cnt / total) * 100.0, 1) if total > 0 else 0.0
            breakdown.append(DashboardSourceBreakdown(source=source, count=cnt, percentage=pct))

        return breakdown

    async def get_average_stage_durations(self) -> list[DashboardStageDuration]:
        """
        Computes average time spent in each stage from stage_events history.
        Tracks intervals between consecutive events for each candidate.
        """
        # Fetch events ordered by candidate and timestamp
        stmt = (
            select(
                StageEvent.candidate_id,
                StageEvent.from_stage,
                StageEvent.to_stage,
                StageEvent.created_at,
            )
            .join(Candidate, StageEvent.candidate_id == Candidate.id)
            .where(Candidate.deleted_at.is_(None))
            .order_by(StageEvent.candidate_id, StageEvent.created_at)
        )
        res = await self.session.execute(stmt)
        events = res.all()

        stage_durations: dict[CandidateStage, list[float]] = {s: [] for s in CandidateStage}

        # Calculate time spent between transitions
        by_candidate: dict[uuid.UUID, list] = {}
        for ev in events:
            by_candidate.setdefault(ev.candidate_id, []).append(ev)

        for cand_events in by_candidate.values():
            for i in range(len(cand_events) - 1):
                cur_ev = cand_events[i]
                next_ev = cand_events[i + 1]
                # Duration spent in cur_ev.to_stage until next_ev.created_at
                stg = cur_ev.to_stage
                diff_days = (next_ev.created_at - cur_ev.created_at).total_seconds() / 86400.0
                if diff_days >= 0:
                    stage_durations[stg].append(diff_days)

        results: list[DashboardStageDuration] = []
        for stage in [
            CandidateStage.APPLIED,
            CandidateStage.SCREENING,
            CandidateStage.INTERVIEW,
            CandidateStage.TECHNICAL,
            CandidateStage.OFFER,
        ]:
            durations = stage_durations.get(stage, [])
            avg_d = round(sum(durations) / len(durations), 1) if durations else None
            results.append(DashboardStageDuration(stage=stage, avg_days=avg_d))

        return results
