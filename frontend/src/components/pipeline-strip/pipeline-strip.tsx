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
  screening: 'bg-orange-400',
  interview: 'bg-teal-400',
  technical: 'bg-amber-400',
  offer: 'bg-purple-400',
  hired: 'bg-emerald-400',
  rejected: 'bg-rose-400',
};

const STAGE_BAR_COLORS: Record<CandidateStage, string> = {
  applied: 'bg-slate-400',
  screening: 'bg-orange-400',
  interview: 'bg-teal-400',
  technical: 'bg-amber-400',
  offer: 'bg-purple-400',
  hired: 'bg-emerald-400',
  rejected: 'bg-rose-400',
};

/**
 * Enterprise Pipeline Milestone Strip
 * Refined command ribbon with active stage pills, proportional distribution meter,
 * and keyboard shortcut navigation.
 */
export const PipelineStrip: React.FC<PipelineStripProps> = ({
  funnel = [],
  selectedStage,
  onStageSelect,
  className,
  hideFooterShortcuts = false,
}) => {
  // Map funnel counts to stages
  const countMap = new Map<CandidateStage, number>();
  let totalCount = 0;

  funnel.forEach((item) => {
    countMap.set(item.stage, item.count);
    totalCount += item.count;
  });

  const isEmpty = totalCount === 0;

  // Keyboard shortcut listener: 1-7 for stages, 0 to clear
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
        'w-full bg-slate-900/60 backdrop-blur-md border border-white/[0.08] rounded-2xl p-3 sm:p-3.5 space-y-3 shadow-inner font-sans',
        className
      )}
    >
      {/* Milestone Tabs Row - Proportional Full-Width Distribution */}
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
            'group shrink-0 sm:flex-initial min-w-[105px] sm:min-w-[120px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 select-none cursor-pointer border',
            selectedStage === null
              ? 'bg-slate-800 text-white border-white/[0.14] shadow-xs font-semibold'
              : 'bg-slate-950/70 hover:bg-slate-800/60 border-white/[0.06] text-slate-400 hover:text-slate-200'
          )}
          title="Show all candidate stages (Press 0)"
        >
          <Layers className={clsx('w-3.5 h-3.5 shrink-0', selectedStage === null ? 'text-emerald-400' : 'text-slate-500')} />
          <span>All Stages</span>
          <span
            className={clsx(
              'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight shrink-0',
              selectedStage === null
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            {totalCount}
          </span>
        </button>

        <div className="h-5 w-px bg-white/[0.08] shrink-0 mx-0.5 hidden sm:block" aria-hidden="true" />

        {/* Individual Stage Milestone Chips - Flex-1 Symmetrical Distribution */}
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
                  'group flex-1 min-w-[90px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 select-none cursor-pointer border',
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200 shadow-sm font-semibold ring-1 ring-emerald-500/30'
                    : count > 0
                    ? 'bg-slate-950/70 hover:bg-slate-800/60 border-white/[0.08] text-slate-200'
                    : 'bg-slate-950/40 hover:bg-slate-800/40 border-white/[0.04] text-slate-400 hover:text-slate-300'
                )}
                title={`${stage.label}: ${count} candidates (Press ${stage.keyboardKey} to filter)`}
              >
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125',
                    STAGE_DOT_COLORS[stage.key]
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{stage.label}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight shrink-0',
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : count > 0
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-900 text-slate-500 border border-white/[0.04]'
                  )}
                >
                  {count}
                </span>
                <kbd
                  className={clsx(
                    'hidden xl:inline-flex px-1 py-0.2 text-[9px] font-mono rounded border shrink-0',
                    isSelected
                      ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-500 border-white/[0.06] opacity-60 group-hover:opacity-100'
                  )}
                >
                  {stage.keyboardKey}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proportional Distribution Micro-Meter */}
      {!isEmpty && (
        <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden flex shadow-inner">
          {STAGES.map((stage) => {
            const count = countMap.get(stage.key) || 0;
            if (count === 0) return null;
            const pct = (count / totalCount) * 100;
            return (
              <div
                key={stage.key}
                style={{ width: `${pct}%` }}
                className={clsx(
                  'h-full transition-all duration-300',
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
            <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-[11px] text-emerald-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
