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
  Plus,
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
import { Breadcrumbs } from '../components/ui/breadcrumbs';
import { SOURCE_LABELS, formatRelativeTime } from '../lib/tokens';

export interface DashboardPageProps {
  onSelectCandidate: (id: string) => void;
  onOpenCreateCandidate: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectCandidate,
  onOpenCreateCandidate,
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <Breadcrumbs
            items={[
              { label: 'ATS Console', onClick: () => navigate('/dashboard') },
              { label: 'Command Center' },
            ]}
            className="mb-1.5"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Recruitment Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pipeline Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            Real-time pipeline analytics, throughput velocity, and candidate funnel conversion.
          </p>
        </div>

        {/* Executive Telemetry Hub (Bridges the Empty Horizontal Void) */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/[0.08] shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Pipeline Stream</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="font-bold text-white">{summary?.total_candidates ?? 0}</span>
            <span>Total Profiles</span>
          </div>
          <div className="h-3.5 w-px bg-white/10" />
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <span className="font-bold text-teal-400">{summary?.active_pipeline ?? 0}</span>
            <span>Active Funnel</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/candidates')}
            className="border-white/[0.12] hover:bg-slate-800/80 text-slate-300 font-medium"
          >
            <span>View Talent Pool</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-400 stroke-[2]" aria-hidden="true" />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateCandidate}
            className="shadow-sm shadow-emerald-950/40 font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5 stroke-[2.2]" aria-hidden="true" />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* Top Metric Cards (Linear / Supabase Inspired Surface) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Candidates */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-white/[0.08] text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="font-display text-2xl font-bold tracking-tight text-white tnum font-mono">
              {summary?.total_candidates ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">All applications</span>
        </div>

        {/* Active Pipeline */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="font-display text-2xl font-bold tracking-tight text-teal-300 tnum font-mono">
              {summary?.active_pipeline ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Screening & Interview</span>
        </div>

        {/* Hired */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hired</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="font-display text-2xl font-bold tracking-tight text-emerald-400 tnum font-mono">
              {summary?.hired ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Offers accepted</span>
        </div>

        {/* Archived / Rejected */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Archived</span>
            <div className="w-8 h-8 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="font-display text-2xl font-bold tracking-tight text-slate-300 tnum font-mono">
              {summary?.rejected ?? 0}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Closed records</span>
        </div>

        {/* Last 7 Days */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Velocity (7d)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-white tnum font-mono">
                {summary?.new_last_7_days ?? 0}
              </span>
              {summary?.new_7_days_change !== null && summary?.new_7_days_change !== undefined && (
                <span
                  className={`text-xs font-semibold px-1 py-0.2 rounded ${
                    summary.new_7_days_change >= 0
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                      : 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
                  }`}
                >
                  {summary.new_7_days_change >= 0 ? '+' : ''}
                  {summary.new_7_days_change.toFixed(0)}%
                </span>
              )}
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">New applicants</span>
        </div>

        {/* Hire Rate */}
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] hover:border-white/[0.14] p-4 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Conversion</span>
            <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <div className="font-display text-2xl font-bold tracking-tight text-white tnum font-mono">
              {(summary?.hire_rate ?? 0).toFixed(1)}%
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Hire-to-close ratio</span>
        </div>
      </div>

      {/* Pipeline Velocity & Stage Distribution */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-4 sm:p-5 space-y-4 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white font-display">
              Pipeline Velocity & Stage Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any stage milestone to filter candidates. Use numeric keys 1–7 to navigate stages instantly.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-slate-950/60 px-2.5 py-1 rounded-lg border border-white/[0.06] shrink-0">
            <span>Shortcuts:</span>
            <span className="text-emerald-400 font-bold">1–7 stage</span>
            <span>•</span>
            <span className="text-slate-300 font-bold">0 all</span>
          </div>
        </div>

        {funnelLoading ? (
          <Skeleton className="h-14 w-full rounded-xl" />
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
        <div className="lg:col-span-7 bg-slate-900/60 rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-display">
                Weekly Application Throughput
              </h2>
              <p className="text-xs text-slate-400">Candidate submission volume trend over rolling 8 weeks</p>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
              Rolling 8w
            </span>
          </div>

          <div className="h-64 w-full min-w-0 overflow-hidden pt-2">
            {timeseriesLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : timeseries.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState title="No historical data" description="Applications will appear here once candidates are added." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="week_label"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    stroke="rgba(255,255,255,0.1)"
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    stroke="rgba(255,255,255,0.1)"
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/[0.12] p-3 shadow-2xl text-xs font-sans">
                          <div className="text-[11px] text-slate-400 font-medium">{data.week_label}</div>
                          <div className="font-bold text-emerald-400 font-display text-sm mt-0.5">
                            {data.count} {data.count === 1 ? 'applicant' : 'applicants'}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Source Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-display">
                Channel Acquisition
              </h2>
              <p className="text-xs text-slate-400">Inbound candidate sourcing channels</p>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 border border-white/[0.08] px-2.5 py-0.5 rounded-lg">
              Sources
            </span>
          </div>

          {sourcesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : sources.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <EmptyState title="No source data" description="Source breakdown will populate as applications arrive." />
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {sources.map((item) => {
                const total = sources.reduce((sum, s) => sum + s.count, 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200 font-medium">
                        {SOURCE_LABELS[item.source as keyof typeof SOURCE_LABELS] || item.source}
                      </span>
                      <div className="flex items-center gap-2 tnum font-mono">
                        <span className="text-white font-bold">{item.count}</span>
                        <span className="text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/[0.04]">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Stage Durations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Stage Durations (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-display">
                Stage Latency (Average Days)
              </h2>
              <p className="text-xs text-slate-400">Time spent in each evaluation milestone</p>
            </div>
            <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </div>

          {durationsLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ) : stageDurations.length === 0 ? (
            <EmptyState title="No duration metrics" description="Averages will calculate as candidates progress." />
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {stageDurations.map((d) => (
                <div key={d.stage} className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                  <StageBadge stage={d.stage} />
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="font-bold text-white text-sm font-display tnum">
                      {d.avg_days !== null && d.avg_days !== undefined ? d.avg_days.toFixed(1) : '—'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{d.avg_days === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-display">
                Real-Time Hiring Audit Feed
              </h2>
              <p className="text-xs text-slate-400">Candidate status transitions and stage moves</p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/candidates')}
              className="text-slate-400 hover:text-white"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {activityLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No recent candidate transitions recorded yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectCandidate(act.candidate_id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/[0.1] text-slate-300 font-semibold text-xs flex items-center justify-center shrink-0">
                      {act.candidate_name ? act.candidate_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white group-hover:text-emerald-400 transition-colors truncate">
                          {act.candidate_name}
                        </span>
                        {((act as any).applied_role || (act as any).changer_name) && (
                          <>
                            <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
                            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
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
                        <span className="font-semibold text-emerald-400 capitalize">{act.to_stage}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <StageBadge stage={act.to_stage} />
                    <span className="text-[11px] text-slate-400 font-mono">
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
