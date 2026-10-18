import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Sliders,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  useScreeningPresets,
  useBatchScreenCandidates,
  useScreenCandidate,
  useCandidates,
  type CandidateRead,
  type BatchScreenResponse,
} from '../../lib/api';

export interface BatchScreeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates?: CandidateRead[];
  candidateIds?: string[];
  selectedCandidateIds?: Set<string>;
  onScreeningCompleted?: () => void;
}

export const BatchScreeningModal: React.FC<BatchScreeningModalProps> = ({
  open,
  onOpenChange,
  candidates: providedCandidates,
  candidateIds,
  selectedCandidateIds,
  onScreeningCompleted,
}) => {
  const { data: presets = [] } = useScreeningPresets();
  const batchScreenMutation = useBatchScreenCandidates();
  const singleScreenMutation = useScreenCandidate();
  const candidateListQuery = useCandidates({ page_size: 100 });

  const allCandidates = React.useMemo(() => {
    if (providedCandidates && providedCandidates.length > 0) {
      return providedCandidates;
    }
    return candidateListQuery.data?.items || [];
  }, [providedCandidates, candidateListQuery.data?.items]);

  const [selectedRole, setSelectedRole] = useState<string>('Full Stack Developer');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(60);
  const [results, setResults] = useState<BatchScreenResponse | null>(null);

  // Initialize JD on preset change or mount
  React.useEffect(() => {
    if (presets.length > 0 && !jobDescription) {
      const match = presets.find((p) => p.role === selectedRole) || presets[0];
      setJobDescription(match.description);
      setThreshold(match.default_threshold || 60);
    }
  }, [presets, selectedRole, jobDescription]);

  const handlePresetSelect = (role: string) => {
    setSelectedRole(role);
    const match = presets.find((p) => p.role === role);
    if (match) {
      setJobDescription(match.description);
      setThreshold(match.default_threshold || 60);
    }
  };

  // Determine which candidates to screen
  const targetCandidates = React.useMemo(() => {
    if (candidateIds && candidateIds.length > 0) {
      const idSet = new Set(candidateIds);
      return allCandidates.filter((c) => idSet.has(c.id));
    }
    if (selectedCandidateIds && selectedCandidateIds.size > 0) {
      return allCandidates.filter((c) => selectedCandidateIds.has(c.id));
    }
    // Default: screen candidates in 'applied' or all visible
    const applied = allCandidates.filter((c) => c.current_stage === 'applied');
    return applied.length > 0 ? applied : allCandidates;
  }, [allCandidates, candidateIds, selectedCandidateIds]);

  // Run Batch Screening Evaluation
  const handleRunBatchScreening = async (autoApply = false) => {
    if (targetCandidates.length === 0) return;

    try {
      const res = await batchScreenMutation.mutateAsync({
        candidate_ids: targetCandidates.map((c) => c.id),
        job_description: jobDescription,
        threshold,
        auto_apply: autoApply,
      });
      setResults(res);
      if (autoApply) {
        onScreeningCompleted?.();
      }
    } catch (err) {
      console.error('Batch screening failed:', err);
    }
  };

  // Apply single action from results
  const handleSingleAction = async (candidateId: string, accept: boolean) => {
    try {
      await singleScreenMutation.mutateAsync({
        candidateId,
        job_description: jobDescription,
        threshold,
        auto_apply: true,
      });
      // Update local result status
      if (results) {
        setResults({
          ...results,
          results: results.results.map((r: any) =>
            r.candidate_id === candidateId
              ? { ...r, decision: accept ? 'ACCEPT' : 'REJECT', is_accepted: accept }
              : r
          ),
        });
      }
      onScreeningCompleted?.();
    } catch (err) {
      console.error('Failed to apply decision:', err);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-[#111827] rounded-2xl border border-white/[0.12] shadow-2xl p-5 sm:p-6 flex flex-col space-y-4 focus:outline-none overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <Dialog.Title className="text-base font-bold text-white font-display">
                  Batch Keyword Match Screening
                </Dialog.Title>
              </div>
              <Dialog.Description className="text-xs text-slate-400 mt-0.5">
                Screen {targetCandidates.length} candidate{targetCandidates.length === 1 ? '' : 's'} and automatically accept or reject based on keyword criteria.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Configuration Form */}
          <div className="space-y-3 bg-[#151F32] p-3.5 rounded-xl border border-white/[0.08] shrink-0 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 mb-1 block">Role Template</label>
                <select
                  value={selectedRole}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {presets.map((p) => (
                    <option key={p.role} value={p.role}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-slate-400" />
                    <span>Acceptance Threshold</span>
                  </label>
                  <span className="font-bold text-white tnum">{threshold}%</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={90}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-2"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 mb-1 block">Job Requirements & Keywords</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans resize-none"
                placeholder="Job description keywords..."
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400 font-medium">
              Candidates queued for screening:{' '}
              <strong className="text-white font-bold">{targetCandidates.length}</strong>
            </span>
            <Button
              variant="primary"
              size="sm"
              loading={batchScreenMutation.isPending}
              onClick={() => handleRunBatchScreening(false)}
            >
              <span>Calculate Matches</span>
            </Button>
          </div>

          {/* Screening Results Area */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px] pr-1">
            {!results ? (
              <div className="h-44 border border-dashed border-white/[0.08] rounded-xl flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <Users className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
                <p className="font-medium text-slate-300">Ready to Screen Candidates</p>
                <p className="text-[11px] mt-0.5 text-slate-500">Click "Calculate Matches" to evaluate keywords for each candidate.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Banner */}
                <div className="bg-[#151F32] border border-white/[0.08] p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Total Evaluated</span>
                      <strong className="font-bold text-white tnum">{results.total_screened}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-emerald-400 block font-medium">Accept (≥ {threshold}%)</span>
                      <strong className="font-bold text-emerald-400 tnum">{results.accepted_count}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-rose-400 block font-medium">Reject (&lt; {threshold}%)</span>
                      <strong className="font-bold text-rose-400 tnum">{results.rejected_count}</strong>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={batchScreenMutation.isPending}
                    onClick={() => handleRunBatchScreening(true)}
                    className="shadow-sm shadow-emerald-950/40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Auto-Apply All Decisions</span>
                  </Button>
                </div>

                {/* Candidate Results List */}
                <div className="space-y-2">
                  {results.results.map((res: any) => {
                    const candidateObj = targetCandidates.find((c) => c.id === res.candidate_id);
                    return (
                      <div
                        key={res.candidate_id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          res.is_accepted
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-rose-950/20 border-rose-500/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">
                              {res.candidate_name || candidateObj?.full_name || 'Candidate'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                res.is_accepted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {res.decision}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={res.summary_reason}>
                            {res.summary_reason}
                          </p>
                          {res.matched_keywords && res.matched_keywords.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-medium">Matched:</span>
                              {res.matched_keywords.slice(0, 4).map((kw: string) => (
                                <span
                                  key={kw}
                                  className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 rounded text-[10px] font-medium border border-emerald-500/30"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span
                              className={`text-lg font-black font-display tnum ${
                                res.is_accepted ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {res.score ? res.score.toFixed(0) : 0}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {res.is_accepted ? (
                              <button
                                type="button"
                                onClick={() => handleSingleAction(res.candidate_id, true)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Move to Screening stage"
                              >
                                Accept
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSingleAction(res.candidate_id, false)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Move to Rejected stage"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08] shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
