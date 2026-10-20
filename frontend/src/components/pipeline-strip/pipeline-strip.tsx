import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Layers, X } from 'lucide-react';
import { STAGES } from '../../lib/tokens';
import type { CandidateStage, DashboardFunnelStage } from '../../lib/api';

export interface PipelineStripProps {
  funnel?: DashboardFunnelStage[];
  selectedStage?: CandidateStage | null;
  onStageSelect?: (stage: CandidateStage | null) => void;
  className?: string;
  hideFooterShortcuts?: boolean;
}

const STAGE_DOT_COLORS: Record<CandidateStage, string> = {
  applied: 'bg-slate-400',
  screening: 'bg-blue-400',
  interview: 'bg-sky-400',
  technical: 'bg-indigo-400',
  offer: 'bg-violet-400',
  hired: 'bg-emerald-400',
  rejected: 'bg-rose-400',
};

const STAGE_BAR_COLORS: Record<CandidateStage, string> = {
  applied: 'bg-slate-500',
  screening: 'bg-blue-500',
  interview: 'bg-sky-500',
  technical: 'bg-indigo-500',
  offer: 'bg-violet-500',
  hired: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

/**
 * Clean Pipeline Milestone Navigation Strip
 * Proportional stage distribution meter, active stage filtering, and keyboard navigation.
 */
export const PipelineStrip: React.FC<PipelineStripProps> = ({
  funnel = [],
  selectedStage,
  onStageSelect,
  className,
  hideFooterShortcuts = false,
}) => {
  const countMap = new Map<CandidateStage, number>();
  let totalCount = 0;

  funnel.forEach((item) => {
    countMap.set(item.stage, item.count);
    totalCount += item.count;
  });

  const isEmpty = totalCount === 0;

  // Keyboard navigation: 1-7 for stages, 0 to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        onStageSelect?.(null);
        return;
      }

      const match = STAGES.find((s) => s.keyboardKey === e.key);
      if (match) {
        e.preventDefault();
        onStageSelect?.(match.key === selectedStage ? null : match.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStage, onStageSelect]);

  return (
    <div
      className={clsx(
        'w-full bg-[#0E131F]/90 border border-white/[0.08] rounded-xl p-3 sm:p-3.5 space-y-3 font-sans shadow-sm',
        className
      )}
    >
      {/* Milestone Tabs Row */}
      <div
        role="radiogroup"
        aria-label="Pipeline evaluation stages"
        className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto pb-1 sm:pb-0 scroll-smooth no-scrollbar"
      >
        {/* All Stages Master Tab */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedStage === null}
          onClick={() => onStageSelect?.(null)}
          className={clsx(
            'group shrink-0 min-w-[110px] sm:min-w-[125px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none cursor-pointer border',
            selectedStage === null
              ? 'bg-white/[0.08] text-white border-white/[0.16] font-semibold'
              : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-slate-400 hover:text-slate-200'
          )}
          title="Show all candidate stages (Press 0)"
        >
          <Layers className={clsx('w-3.5 h-3.5 shrink-0', selectedStage === null ? 'text-slate-200' : 'text-slate-500')} />
          <span>All Stages</span>
          <span
            className={clsx(
              'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium leading-tight shrink-0',
              selectedStage === null
                ? 'bg-white/[0.12] text-white'
                : 'bg-white/[0.05] text-slate-400'
            )}
          >
            {totalCount}
          </span>
        </button>

        <div className="h-5 w-px bg-white/[0.08] shrink-0 mx-0.5 hidden sm:block" aria-hidden="true" />

        {/* Individual Stage Milestone Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {STAGES.map((stage) => {
            const count = countMap.get(stage.key) || 0;
            const isSelected = selectedStage === stage.key;

            return (
              <button
                key={stage.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onStageSelect?.(isSelected ? null : stage.key)}
                className={clsx(
                  'group flex-1 min-w-[92px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors select-none cursor-pointer border',
                  isSelected
                    ? 'bg-white/[0.1] border-white/[0.22] text-white font-semibold'
                    : count > 0
                    ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.07] text-slate-300'
                    : 'bg-transparent hover:bg-white/[0.04] border-white/[0.04] text-slate-500 hover:text-slate-300'
                )}
                title={`${stage.label}: ${count} candidates (Press ${stage.keyboardKey} to filter)`}
              >
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    STAGE_DOT_COLORS[stage.key]
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{stage.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-tight shrink-0',
                    isSelected
                      ? 'bg-white/[0.18] text-white font-semibold'
                      : count > 0
                      ? 'bg-white/[0.06] text-slate-300'
                      : 'bg-white/[0.03] text-slate-500'
                  )}
                >
                  {count}
                </span>
                <kbd
                  className={clsx(
                    'hidden xl:inline-flex px-1 py-0.2 text-[9px] font-mono rounded border shrink-0',
                    isSelected
                      ? 'bg-white/[0.12] text-slate-200 border-white/[0.15]'
                      : 'bg-white/[0.03] text-slate-500 border-white/[0.06]'
                  )}
                >
                  {stage.keyboardKey}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proportional Distribution Bar */}
      {!isEmpty && (
        <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden flex">
          {STAGES.map((stage) => {
            const count = countMap.get(stage.key) || 0;
            if (count === 0) return null;
            const pct = (count / totalCount) * 100;
            return (
              <div
                key={stage.key}
                style={{ width: `${pct}%` }}
                className={clsx(
                  'h-full transition-all duration-200',
                  STAGE_BAR_COLORS[stage.key],
                  selectedStage && selectedStage !== stage.key && 'opacity-20'
                )}
                title={`${stage.label}: ${count} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Telemetry & Filter Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
        <div className="flex items-center gap-2">
          {selectedStage ? (
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] rounded-md px-2.5 py-1 text-[11px] text-slate-200 font-medium">
              <span className={clsx('w-1.5 h-1.5 rounded-full', STAGE_DOT_COLORS[selectedStage])} />
              <span>
                Filtered by <strong className="text-white capitalize">{selectedStage}</strong> ({countMap.get(selectedStage) || 0})
              </span>
              <button
                type="button"
                onClick={() => onStageSelect?.(null)}
                className="ml-1 text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Clear filter (0)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">
              {isEmpty
                ? 'No active candidates in pipeline.'
                : `Total pipeline volume: ${totalCount} candidate${totalCount === 1 ? '' : 's'} across active requisitions`}
            </span>
          )}
        </div>

        {!hideFooterShortcuts && (
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span>Shortcuts:</span>
            <span className="text-slate-400">1–7 stage</span>
            <span>•</span>
            <span className="text-slate-400">0 all</span>
          </div>
        )}
      </div>
    </div>
  );
};
