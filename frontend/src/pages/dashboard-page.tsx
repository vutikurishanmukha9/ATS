import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  useDashboardSummary,
  useDashboardFunnel,
  useDashboardTimeseries,
  useDashboardSources,
  useDashboardStageDurations,
  useDashboardRecentActivity,
  type CandidateStage,
} from '../lib/api';
import { PipelineStrip } from '../components/pipeline-strip/pipeline-strip';
import { StageBadge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { SOURCE_LABELS, formatRelativeTime } from '../lib/tokens';

export interface DashboardPageProps {
  onSelectCandidate: (id: string) => void;
  onOpenCreateCandidate: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectCandidate,
  onOpenCreateCandidate: _onOpenCreateCandidate,
}) => {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: funnel = [], isLoading: funnelLoading } = useDashboardFunnel();
  const { data: timeseries = [], isLoading: timeseriesLoading } = useDashboardTimeseries(8);
  const { data: sources = [], isLoading: sourcesLoading } = useDashboardSources();
  const { data: stageDurations = [], isLoading: durationsLoading } = useDashboardStageDurations();
  const { data: recentActivity = [], isLoading: activityLoading } = useDashboardRecentActivity(8);

  const handleStageClick = (stage: CandidateStage | null) => {
    if (stage) {
      navigate(`/candidates?stage=${stage}`);
    } else {
      navigate('/candidates');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>ATS</span>
            <span>/</span>
            <span className="text-slate-400">Dashboard</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview of candidate pipeline, hiring velocity, and stage conversion.
          </p>
        </div>

        {/* Clean Contextual Action */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/candidates')}
            className="border-slate-800 hover:bg-slate-800/80 text-slate-300 font-medium text-xs h-8"
          >
            <span>View All Candidates</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-400" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Candidates */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Applicants</span>
            <Users className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-white tnum">
              {summary?.total_candidates ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">All applications</span>
        </div>

        {/* In Active Pipeline */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Pipeline</span>
            <Briefcase className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-emerald-400 tnum">
              {summary?.active_pipeline ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">In active evaluation</span>
        </div>

        {/* Hired */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Hired</span>
            <CheckCircle2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-white tnum">
              {summary?.hired ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">Offers accepted</span>
        </div>

        {/* Archived */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Archived</span>
            <XCircle className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-slate-300 tnum">
              {summary?.rejected ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">Rejected or withdrawn</span>
        </div>

        {/* 7-Day Velocity */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">New (7 Days)</span>
            <TrendingUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-white tnum">
                {summary?.new_last_7_days ?? 0}
              </span>
              {summary?.new_7_days_change !== null && summary?.new_7_days_change !== undefined && (
                <span className="text-[11px] text-slate-400 font-mono">
                  {summary.new_7_days_change >= 0 ? '+' : ''}
                  {summary.new_7_days_change.toFixed(0)}%
                </span>
              )}
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">Recent submissions</span>
        </div>

        {/* Conversion Rate */}
        <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Hire Rate</span>
            <Percent className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight text-white tnum">
              {(summary?.hire_rate ?? 0).toFixed(1)}%
            </div>
          )}
          <span className="text-[11px] text-slate-500 mt-1">Applicant conversion</span>
        </div>
      </div>

      {/* Pipeline Velocity & Stage Distribution */}
      <div className="bg-[#0E131F] rounded-lg border border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-100">
              Pipeline Stages
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any stage to filter candidate records.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Keyboard navigation: <span className="font-mono text-slate-400">1–7</span> for stages, <span className="font-mono text-slate-400">0</span> for all
          </div>
        </div>

        {funnelLoading ? (
          <Skeleton className="h-12 w-full rounded-md" />
        ) : (
          <PipelineStrip
            funnel={funnel}
            onStageSelect={handleStageClick}
            className="bg-transparent border-0 p-0 shadow-none space-y-3"
            hideFooterShortcuts
          />
        )}
      </div>

      {/* Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Weekly Applications Bar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#0E131F] rounded-lg border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Application Volume
              </h2>
              <p className="text-xs text-slate-400">Candidate submissions over the last 8 weeks</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
              8 Weeks
            </span>
          </div>

          <div className="h-60 w-full min-w-0 overflow-hidden pt-2">
            {timeseriesLoading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : timeseries.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState title="No historical data" description="Applications will appear here once candidates are added." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="week_label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    stroke="rgba(255,255,255,0.08)"
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    stroke="rgba(255,255,255,0.08)"
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 rounded-md border border-slate-700 p-2.5 shadow-xl text-xs">
                          <div className="text-[11px] text-slate-400">{data.week_label}</div>
                          <div className="font-semibold text-white mt-0.5">
                            {data.count} {data.count === 1 ? 'applicant' : 'applicants'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Source Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-[#0E131F] rounded-lg border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Sourcing Channels
              </h2>
              <p className="text-xs text-slate-400">Inbound candidate acquisition breakdown</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
              Channels
            </span>
          </div>

          {sourcesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ) : sources.length === 0 ? (
            <div className="h-60 flex items-center justify-center">
              <EmptyState title="No source data" description="Source breakdown will populate as applications arrive." />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {sources.map((item) => {
                const total = sources.reduce((sum, s) => sum + s.count, 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        {SOURCE_LABELS[item.source as keyof typeof SOURCE_LABELS] || item.source}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-slate-200">{item.count}</span>
                        <span className="text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Stage Latency & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Stage Latency (5 cols) */}
        <div className="lg:col-span-5 bg-[#0E131F] rounded-lg border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Average Stage Latency
              </h2>
              <p className="text-xs text-slate-400">Average days spent in evaluation stages</p>
            </div>
            <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>

          {durationsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-7 w-full rounded" />
            </div>
          ) : stageDurations.length === 0 ? (
            <EmptyState title="No duration metrics" description="Averages will calculate as candidates progress." />
          ) : (
            <div className="divide-y divide-slate-800">
              {stageDurations.map((d) => (
                <div key={d.stage} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                  <StageBadge stage={d.stage} />
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="font-semibold text-white text-xs tnum">
                      {d.avg_days !== null && d.avg_days !== undefined ? d.avg_days.toFixed(1) : '—'}
                    </span>
                    <span className="text-[11px] text-slate-500">{d.avg_days === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed (7 cols) */}
        <div className="lg:col-span-7 bg-[#0E131F] rounded-lg border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">
                Recent Pipeline Activity
              </h2>
              <p className="text-xs text-slate-400">Candidate status transitions and stage moves</p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/candidates')}
              className="text-slate-400 hover:text-white text-xs h-7"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {activityLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-full rounded" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No recent candidate transitions recorded yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectCandidate(act.candidate_id)}
                  className="flex items-center justify-between p-2.5 rounded-md bg-[#090D16] hover:bg-slate-800/60 border border-slate-850 hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center shrink-0">
                      {act.candidate_name ? act.candidate_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-slate-200 group-hover:text-white transition-colors truncate">
                          {act.candidate_name}
                        </span>
                        {((act as any).applied_role || (act as any).changer_name) && (
                          <>
                            <span className="text-[11px] text-slate-600 hidden sm:inline">•</span>
                            <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                              {(act as any).applied_role || `by ${(act as any).changer_name}`}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        {act.from_stage && (
                          <>
                            <span className="capitalize">{act.from_stage}</span>
                            <span>→</span>
                          </>
                        )}
                        <span className="font-medium text-emerald-400 capitalize">{act.to_stage}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StageBadge stage={act.to_stage} />
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
