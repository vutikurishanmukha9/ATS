import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Table as TableIcon,
  Columns3,
  Trash2,
  ArrowUpDown,
  X,
  RotateCcw,
  User,
  Users,
  Briefcase,
  TrendingUp,
  Award,
  ArrowUpRight,
  Edit2,
  FileSearch,
  Download,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  useCandidates,
  useBulkChangeStage,
  useChangeStage,
  useDeleteCandidate,
  useDashboardFunnel,
  type CandidateRead,
  type CandidateStage,
  type CandidateSource,
} from '../lib/api';
import { STAGES, SOURCE_LABELS, formatRelativeTime } from '../lib/tokens';
import { PipelineStrip } from '../components/pipeline-strip/pipeline-strip';
import { StageBadge, Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { SegmentedControl } from '../components/ui/segmented-control';
import { ActionBar } from '../components/ui/action-bar';
import { Pagination } from '../components/ui/pagination';
import { StatusIndicator } from '../components/ui/status-indicator';
import { toast } from '../lib/toast';
import { BatchScreeningModal } from '../components/screening/batch-screening-modal';

export interface CandidatesPageProps {
  onSelectCandidate: (id: string) => void;
  onEditCandidate: (candidate: CandidateRead) => void;
  onOpenCreateCandidate: () => void;
}

export const CandidatesPage: React.FC<CandidatesPageProps> = ({
  onSelectCandidate,
  onEditCandidate,
  onOpenCreateCandidate,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & filter states
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [selectedStage, setSelectedStage] = useState<CandidateStage | null>(
    (searchParams.get('stage') as CandidateStage) || null
  );
  const [selectedSource, setSelectedSource] = useState<CandidateSource | ''>(
    (searchParams.get('source') as CandidateSource) || ''
  );
  const [matchScoreFilter, setMatchScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStageModal, setBulkStageModal] = useState(false);
  const [targetBulkStage, setTargetBulkStage] = useState<CandidateStage>('interview');
  const [bulkReason, setBulkReason] = useState('');
  const [screeningModalOpen, setScreeningModalOpen] = useState(false);

  // Active drag candidate for Board view
  const [activeDragCandidate, setActiveDragCandidate] = useState<CandidateRead | null>(null);

  // Sync stage from URL if changed externally
  useEffect(() => {
    const urlStage = searchParams.get('stage') as CandidateStage;
    if (urlStage && urlStage !== selectedStage) {
      setSelectedStage(urlStage);
    }
  }, [searchParams]);

  // Query candidates
  const listParams = useMemo(() => ({
    q: searchInput || undefined,
    stage: selectedStage ? [selectedStage] : undefined,
    source: selectedSource ? [selectedSource] : undefined,
    page,
    page_size: pageSize,
    sort: sortField,
    order: sortOrder,
  }), [searchInput, selectedStage, selectedSource, page, pageSize, sortField, sortOrder]);

  const { data: candidateData, isLoading } = useCandidates(listParams);
  const { data: funnel = [] } = useDashboardFunnel();

  const bulkStageMutation = useBulkChangeStage();
  const changeStageMutation = useChangeStage('');
  const deleteMutation = useDeleteCandidate();

  const candidates = candidateData?.items || [];
  const displayCandidates = useMemo(() => {
    if (matchScoreFilter === 'all') return candidates;
    return candidates.filter((c) => {
      if (matchScoreFilter === 'high') return (c.match_score ?? 0) >= 70;
      if (matchScoreFilter === 'medium') return (c.match_score ?? 0) >= 50 && (c.match_score ?? 0) < 70;
      if (matchScoreFilter === 'low') return (c.match_score ?? 0) < 50;
      return true;
    });
  }, [candidates, matchScoreFilter]);

  const totalCount = candidateData?.total || 0;

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleStageSelect = (stage: CandidateStage | null) => {
    setSelectedStage(stage);
    setPage(1);
    if (stage) {
      setSearchParams({ stage });
    } else {
      setSearchParams({});
    }
  };

  const handleBulkStageChange = async () => {
    if (selectedIds.size === 0) return;
    try {
      const count = selectedIds.size;
      await bulkStageMutation.mutateAsync({
        candidate_ids: Array.from(selectedIds),
        to_stage: targetBulkStage,
        reason: bulkReason || undefined,
      });
      toast.success(`Successfully moved ${count} candidates to ${targetBulkStage}`);
      setSelectedIds(new Set());
      setBulkStageModal(false);
      setBulkReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update selected candidates');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected candidates?`)) {
      return;
    }
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteMutation.mutateAsync(id);
      }
      toast.info(`Deleted ${count} candidates`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete some candidates');
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const candidateId = event.active.id as string;
    const match = candidates.find((c) => c.id === candidateId);
    if (match) {
      setActiveDragCandidate(match);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCandidate(null);

    if (!over) return;
    const candidateId = active.id as string;
    const toStage = over.id as CandidateStage;

    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate || candidate.current_stage === toStage) return;

    try {
      await changeStageMutation.mutateAsync({
        to_stage: toStage,
      });
      toast.success(`Candidate ${candidate.full_name} moved to ${toStage}`);
    } catch (err: any) {
      toast.error(err.message || 'Unable to move candidate stage');
    }
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden font-sans">
      {/* Executive Pipeline Intelligence Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Talent Pool</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{totalCount}</div>
            <div className="text-[10px] text-slate-400">Total active profiles</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">In Active Review</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {candidates.filter((c) => ['screening', 'interview', 'technical'].includes(c.current_stage)).length}
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">Screening & Technical</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center text-teal-400">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">High Match Rate</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {totalCount > 0
                ? `${Math.round(
                    (candidates.filter((c) => (c.match_score ?? 0) >= 70).length / totalCount) * 100
                  )}%`
                : '0%'}
            </div>
            <div className="text-[10px] text-slate-400">≥ 70% ATS score</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Offers Extended</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {candidates.filter((c) => c.current_stage === 'offer').length}
            </div>
            <div className="text-[10px] text-purple-400 font-mono">Final milestone</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center text-purple-400">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Pipeline Milestone Strip */}
      <PipelineStrip
        funnel={funnel}
        selectedStage={selectedStage}
        onStageSelect={handleStageSelect}
      />

      {/* Enterprise Command & Filter Toolbar */}
      <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-auto sm:min-w-[240px] md:max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search talent pool (e.g. Python AND Docker)..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-9 pr-14 text-xs bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all font-sans"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1">
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1 py-0.2 text-[10px] font-mono text-slate-500 bg-slate-900 border border-white/[0.08] rounded">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Boolean Syntax Indicator */}
          {Boolean(searchInput && /\b(AND|OR|NOT)\b/i.test(searchInput)) && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
              Boolean Query Active
            </span>
          )}

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value as CandidateSource);
              setPage(1);
            }}
            className="h-9 px-3 text-xs bg-slate-950/80 hover:bg-slate-950 border border-white/[0.1] rounded-xl text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all cursor-pointer w-full sm:w-auto"
          >
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Match Score Filter */}
          <select
            value={matchScoreFilter}
            onChange={(e) => setMatchScoreFilter(e.target.value as any)}
            className="h-9 px-3 text-xs bg-slate-950/80 hover:bg-slate-950 border border-white/[0.1] rounded-xl text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Match %</option>
            <option value="high">High Match (≥ 70%)</option>
            <option value="medium">Moderate (50–69%)</option>
            <option value="low">Low Match (&lt; 50%)</option>
          </select>

          {/* Active Filter Clear Tag */}
          {(selectedStage || selectedSource || searchInput || matchScoreFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedStage(null);
                setSelectedSource('');
                setSearchInput('');
                setMatchScoreFilter('all');
                setSearchParams({});
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-white/[0.08] rounded-xl transition-colors cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: View Controls, Density & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto">
          {/* Table / Board Segmented Control */}
          <SegmentedControl<'table' | 'board'>
            value={viewMode}
            onChange={(val) => setViewMode(val)}
            aria-label="Candidate pipeline view mode"
            options={[
              { id: 'table', label: 'Table', icon: <TableIcon className="w-3.5 h-3.5" /> },
              { id: 'board', label: 'Board', icon: <Columns3 className="w-3.5 h-3.5" /> },
            ]}
          />

          {/* Density Segmented Control (for Table view) */}
          {viewMode === 'table' && (
            <div className="hidden sm:block">
              <SegmentedControl<'compact' | 'comfortable'>
                value={density}
                onChange={(val) => setDensity(val)}
                aria-label="Table row density"
                options={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Spacious' },
                ]}
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open('/api/v1/candidates/export/csv', '_blank');
              toast.success('Downloading candidate pipeline CSV...');
            }}
            title="Export candidates pipeline to CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 sm:mr-1 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScreeningModalOpen(true)}
            className="border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40"
          >
            <FileSearch className="w-4 h-4 text-emerald-400 stroke-[2] shrink-0" aria-hidden="true" />
            <span>Keyword Screen</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreateCandidate}
          >
            <Plus className="w-4 h-4 stroke-[2.2] shrink-0" aria-hidden="true" />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* Enterprise Docked Action Bar (Docked at bottom of viewport) */}
      <ActionBar
        selectedCount={selectedIds.size}
        itemTypeLabel="candidates"
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: `Screen Selected (${selectedIds.size})`,
            variant: 'secondary',
            icon: <FileSearch className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />,
            onClick: () => setScreeningModalOpen(true),
          },
          {
            label: 'Move to Stage...',
            variant: 'secondary',
            onClick: () => setBulkStageModal(true),
          },
          {
            label: 'Delete Selected',
            variant: 'danger',
            icon: <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
            onClick: handleBulkDelete,
          },
        ]}
      />

      {/* Main Content: Table or Board */}
      {viewMode === 'table' ? (
        <div className="bg-slate-900/60 rounded-2xl border border-white/[0.08] shadow-inner overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/80 select-none text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  <th className="w-10 px-3.5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selectedIds.size === candidates.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSortField('full_name');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1.5 hover:text-white cursor-pointer font-semibold uppercase tracking-wider"
                    >
                      <span>Candidate</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="px-3.5 py-3 font-semibold uppercase tracking-wider">Applied Role</th>
                  <th className="px-3.5 py-3 font-semibold uppercase tracking-wider">Milestone Stage</th>
                  <th className="px-3.5 py-3 font-semibold uppercase tracking-wider">ATS Match</th>
                  <th className="px-3.5 py-3 font-semibold uppercase tracking-wider">Source</th>
                  <th className="px-3.5 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSortField('created_at');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1.5 hover:text-white cursor-pointer font-semibold uppercase tracking-wider"
                    >
                      <span>Applied</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="w-28 px-3.5 py-3 text-right font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className={density === 'compact' ? 'h-10' : 'h-14'}>
                      <td colSpan={8} className="px-4 py-3">
                        <Skeleton className="h-5 w-full bg-slate-800/60" />
                      </td>
                    </tr>
                  ))
                ) : displayCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <EmptyState
                        title="No candidates found"
                        description={
                          searchInput || selectedStage || selectedSource || matchScoreFilter !== 'all'
                            ? 'No applicants match your active criteria.'
                            : 'Add your first candidate to start tracking applicants through evaluation milestones.'
                        }
                        actionLabel="Add Candidate"
                        onAction={onOpenCreateCandidate}
                      />
                    </td>
                  </tr>
                ) : (
                  displayCandidates.map((candidate) => {
                    const isSelected = selectedIds.has(candidate.id);
                    const rowHeightClass = density === 'compact' ? 'py-2.5' : 'py-3.5';
                    const initials = candidate.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr
                        key={candidate.id}
                        className={`transition-colors hover:bg-slate-800/40 group ${
                          isSelected ? 'bg-emerald-950/30' : ''
                        }`}
                      >
                        <td className="px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(candidate.id, e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                          />
                        </td>
                        <td className={`px-3.5 ${rowHeightClass}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/[0.12] text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs select-none">
                              {initials || <User className="w-3.5 h-3.5 text-slate-500" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <button
                                type="button"
                                onClick={() => onSelectCandidate(candidate.id)}
                                className="font-semibold text-xs text-white group-hover:text-emerald-400 text-left truncate cursor-pointer transition-colors"
                                title={candidate.full_name}
                              >
                                {candidate.full_name}
                              </button>
                              <span className="text-[11px] text-slate-400 font-mono truncate">{candidate.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className={`px-3.5 ${rowHeightClass} text-slate-300 font-medium truncate max-w-[200px]`}>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{candidate.applied_role}</span>
                          </div>
                        </td>
                        <td className={`px-3.5 ${rowHeightClass}`}>
                          <StageBadge stage={candidate.current_stage} />
                        </td>
                        <td className={`px-3.5 ${rowHeightClass}`}>
                          {candidate.match_score !== null && candidate.match_score !== undefined ? (
                            <StatusIndicator
                              type={
                                candidate.match_score >= 70
                                  ? 'success'
                                  : candidate.match_score >= 50
                                  ? 'warning'
                                  : 'danger'
                              }
                              emphasis="low"
                              pulse={candidate.match_score >= 80}
                              className="font-mono text-[11px]"
                            >
                              {Math.round(candidate.match_score)}%
                            </StatusIndicator>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">Unscreened</span>
                          )}
                        </td>
                        <td className={`px-3.5 ${rowHeightClass}`}>
                          <Badge variant="neutral">
                            {SOURCE_LABELS[candidate.source as keyof typeof SOURCE_LABELS] || candidate.source}
                          </Badge>
                        </td>
                        <td className={`px-3.5 ${rowHeightClass} text-[11px] text-slate-400 whitespace-nowrap tnum font-mono`}>
                          {formatRelativeTime(candidate.created_at)}
                        </td>
                        <td className={`px-3.5 ${rowHeightClass} text-right whitespace-nowrap`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => onSelectCandidate(candidate.id)}
                              className="h-7 px-2.5 text-[11px] font-medium border-white/[0.08] hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300"
                            >
                              <span>Dossier</span>
                              <ArrowUpRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => onEditCandidate(candidate)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Edit candidate profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Enterprise Table Pagination */}
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="candidates"
          />
        </div>
      ) : (
        /* Board / Kanban View */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex overflow-x-auto gap-3.5 pb-4 pt-1 items-start min-h-[520px] scroll-smooth">
            {STAGES.map((stageMeta) => {
              const stageCandidates = displayCandidates.filter((c) => c.current_stage === stageMeta.key);
              return (
                <KanbanColumn
                  key={stageMeta.key}
                  stageMeta={stageMeta}
                  candidates={stageCandidates}
                  onSelectCandidate={onSelectCandidate}
                  onAddCandidate={onOpenCreateCandidate}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeDragCandidate && (
              <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl p-3 shadow-2xl opacity-95 cursor-grabbing w-64 text-white">
                <div className="font-semibold text-xs text-white">{activeDragCandidate.full_name}</div>
                <div className="text-[11px] text-slate-400">{activeDragCandidate.applied_role}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Bulk Stage Move Modal */}
      {bulkStageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/[0.12] w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="font-bold text-base text-white font-display">Move {selectedIds.size} Candidates</h3>
              <p className="text-xs text-slate-400 mt-0.5">Select target milestone for all selected applicants.</p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Stage
                </label>
                <select
                  value={targetBulkStage}
                  onChange={(e) => setTargetBulkStage(e.target.value as CandidateStage)}
                  className="w-full h-9 px-3 text-xs bg-slate-950 text-slate-100 border border-white/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transition Reason (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch moved following technical debrief"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-950 text-slate-100 border border-white/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <Button variant="outline" size="sm" onClick={() => setBulkStageModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkStageChange}
                disabled={bulkStageMutation.isPending}
              >
                {bulkStageMutation.isPending ? 'Updating...' : 'Confirm Stage Move'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Keyword Screening Modal */}
      <BatchScreeningModal
        open={screeningModalOpen}
        onOpenChange={setScreeningModalOpen}
        candidates={candidates}
        candidateIds={selectedIds.size > 0 ? Array.from(selectedIds) : undefined}
      />
    </div>
  );
};

// Modern Kanban Column Component
interface KanbanColumnProps {
  stageMeta: (typeof STAGES)[number];
  candidates: CandidateRead[];
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stageMeta,
  candidates,
  onSelectCandidate,
  onAddCandidate,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stageMeta.key,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 min-w-[280px] max-w-[280px] shrink-0 rounded-2xl border transition-all flex flex-col min-h-[500px] p-2.5 ${
        isOver
          ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/40'
          : 'border-white/[0.08] bg-slate-900/50'
      }`}
    >
      {/* Column Header */}
      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white font-display">{stageMeta.label}</span>
          <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-800 rounded-full px-2 py-0.2 tnum border border-white/[0.06]">
            {candidates.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddCandidate}
          className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-md transition-colors cursor-pointer"
          title={`Add candidate to ${stageMeta.label}`}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="h-28 rounded-xl border border-dashed border-white/[0.08] flex items-center justify-center text-center p-3">
            <span className="text-[11px] text-slate-500 font-medium">Drag candidates here</span>
          </div>
        ) : (
          candidates.map((candidate) => (
            <KanbanCard
              key={candidate.id}
              candidate={candidate}
              onSelectCandidate={onSelectCandidate}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Modern Draggable Kanban Card Component
interface KanbanCardProps {
  candidate: CandidateRead;
  onSelectCandidate: (id: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ candidate, onSelectCandidate }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelectCandidate(candidate.id)}
      className={`bg-slate-900/90 rounded-xl border border-white/[0.08] p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all select-none ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="font-semibold text-xs text-white truncate">{candidate.full_name}</div>
      <div className="text-[11px] text-slate-400 truncate mt-0.5">{candidate.applied_role}</div>
      {candidate.match_score !== null && candidate.match_score !== undefined && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-medium">ATS Match</span>
          <StatusIndicator
            type={candidate.match_score >= 60 ? 'success' : 'danger'}
            emphasis="low"
            pulse={candidate.match_score >= 80}
            className="font-mono text-[10px] px-1.5 py-0"
          >
            {Math.round(candidate.match_score)}%
          </StatusIndicator>
        </div>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400">
        <span className="font-medium">
          {SOURCE_LABELS[candidate.source as keyof typeof SOURCE_LABELS] || candidate.source}
        </span>
        <span className="tnum font-mono font-medium">
          {formatRelativeTime(candidate.created_at)}
        </span>
      </div>
    </div>
  );
};
