import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  useScreeningPresets,
  useScreenCandidate,
  useExtractResumeFile,
  type CandidateRead,
  type ScreeningResult,
} from '../../lib/api';

interface ScreeningEvaluationCardProps {
  candidate: CandidateRead;
  onCandidateUpdated?: () => void;
}

export const ScreeningEvaluationCard: React.FC<ScreeningEvaluationCardProps> = ({
  candidate,
  onCandidateUpdated,
}) => {
  const { data: presets = [] } = useScreeningPresets();
  const screenMutation = useScreenCandidate();
  const extractMutation = useExtractResumeFile();

  const [selectedRolePreset, setSelectedRolePreset] = useState<string>(() => {
    return presets[0]?.role || 'Full Stack Developer';
  });

  const [jobDescription, setJobDescription] = useState<string>(() => {
    const match = presets.find((p) => p.role.toLowerCase() === candidate.applied_role.toLowerCase());
    return match ? match.description : presets[0]?.description || '';
  });

  const [threshold, setThreshold] = useState<number>(60);
  const [resumeText, setResumeText] = useState<string>(candidate.resume_text || '');
  const [showTextEditor, setShowTextEditor] = useState<boolean>(false);
  const [showJdEditor, setShowJdEditor] = useState<boolean>(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  // Parse existing match details if already screened
  React.useEffect(() => {
    if (candidate.match_details && !result) {
      try {
        const parsed = JSON.parse(candidate.match_details);
        setResult({
          score: parsed.score,
          threshold: parsed.threshold || 60,
          decision: parsed.decision,
          is_accepted: parsed.decision === 'ACCEPT',
          recommendation: parsed.decision === 'ACCEPT' ? 'Advance to Screening' : 'Reject application',
          summary_reason: parsed.summary,
          matched_keywords: parsed.matched || [],
          missing_keywords: {
            critical: parsed.missing_critical || parsed.critical_missing || [],
            important: parsed.important_missing || [],
            optional: [],
          },
          categorized_skills: {},
          breakdown: parsed.breakdown,
          critical_matched: parsed.critical_matched,
          critical_missing: parsed.critical_missing,
          important_matched: parsed.important_matched,
          important_missing: parsed.important_missing,
          achievements_detected: parsed.achievements_detected || parsed.achievements,
          suggestions: parsed.suggestions,
        });
      } catch (err) {
        // ignore JSON parse error
      }
    }
  }, [candidate.match_details, result]);

  // Handle Preset change
  const handleSelectPreset = (role: string) => {
    setSelectedRolePreset(role);
    const preset = presets.find((p) => p.role === role);
    if (preset) {
      setJobDescription(preset.description);
      setThreshold(preset.default_threshold || 60);
    }
  };

  // Handle Resume File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const extracted = await extractMutation.mutateAsync(file);
      setResumeText(extracted.text);
      setShowTextEditor(true);
    } catch (err) {
      console.error('Failed to extract file:', err);
    }
  };

  // Run Keyword Match Screening
  const handleRunScreening = async (applyDecision = false) => {
    try {
      const res = await screenMutation.mutateAsync({
        candidateId: candidate.id,
        job_description: jobDescription,
        custom_resume_text: resumeText || undefined,
        threshold,
        auto_apply: applyDecision,
      });
      setResult(res);
      if (applyDecision) {
        onCandidateUpdated?.();
      }
    } catch (err) {
      console.error('Screening failed:', err);
    }
  };

  return (
    <div className="bg-[#111827] rounded-2xl border border-white/[0.08] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Keyword Match & Screening Decision
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate resume keywords against job requirements to decide acceptance or rejection.
          </p>
        </div>

        {/* Existing Match Badge */}
        {candidate.match_score !== null && candidate.match_score !== undefined && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Last score:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md tnum border ${
                candidate.match_score >= 60
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}
            >
              {candidate.match_score.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Configuration Row: Preset Selector & Threshold Slider */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#151F32] p-3 rounded-xl border border-white/[0.08] text-xs">
        {/* Preset Selector (7 cols) */}
        <div className="sm:col-span-7 space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-300">Target Role Criteria</label>
            <button
              type="button"
              onClick={() => setShowJdEditor(!showJdEditor)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
            >
              {showJdEditor ? 'Hide Criteria' : 'Edit Criteria'}
            </button>
          </div>
          <select
            value={selectedRolePreset}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="w-full h-8 px-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.role} value={p.role}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Threshold Input (5 cols) */}
        <div className="sm:col-span-5 space-y-1">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-300 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>Pass Threshold</span>
            </label>
            <span className="font-bold text-white tnum text-[11px]">{threshold}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Collapsible JD Editor */}
        {showJdEditor && (
          <div className="col-span-full pt-2 border-t border-white/[0.08] space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Job Description & Required Keywords</span>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              className="w-full text-xs p-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              placeholder="Paste job description and required technologies here..."
            />
          </div>
        )}
      </div>

      {/* Resume Content & Upload Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Resume Content Source</span>
          </span>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer">
              <Upload className="w-3 h-3" />
              <span>{extractMutation.isPending ? 'Extracting...' : 'Upload PDF / TXT'}</span>
              <input
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleFileUpload}
                disabled={extractMutation.isPending}
              />
            </label>
            <button
              type="button"
              onClick={() => setShowTextEditor(!showTextEditor)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
            >
              {showTextEditor ? 'Collapse Text' : resumeText ? 'Inspect Text' : 'Paste Resume Text'}
            </button>
          </div>
        </div>

        {showTextEditor ? (
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={4}
            placeholder="Paste candidate's resume, work experience, or technical skills here..."
            className="w-full text-xs p-3 bg-[#0F172A] border border-white/[0.1] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-200 placeholder:text-slate-500"
          />
        ) : (
          <div className="p-2.5 bg-[#151F32] border border-white/[0.08] rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="truncate max-w-[80%]">
              {resumeText ? (
                <span>
                  Resume text attached <span className="text-slate-400">({resumeText.length} characters)</span>
                </span>
              ) : (
                <span className="text-slate-400 italic">
                  No full resume text attached. Screening will use candidate's declared skills (
                  {candidate.skills?.join(', ') || 'none'}).
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Button: Run Screening */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          loading={screenMutation.isPending}
          onClick={() => handleRunScreening(false)}
        >
          <span>Evaluate Match</span>
        </Button>
      </div>

      {/* Results Card */}
      {result && (
        <div
          className={`rounded-xl border p-4 space-y-3.5 transition-all animate-in fade-in duration-200 ${
            result.is_accepted
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}
        >
          {/* Decision Banner */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              {result.is_accepted ? (
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-display font-bold text-xs uppercase px-2 py-0.5 rounded tracking-wider ${
                      result.is_accepted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {result.decision === 'ACCEPT' ? 'Recommended: ACCEPT' : 'Recommended: REJECT'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    (Threshold: {threshold}%)
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 leading-snug">
                  {result.summary_reason}
                </p>
              </div>
            </div>

            {/* Match Score Display */}
            <div className="text-right">
              <div
                className={`font-display text-2xl font-black tnum ${
                  result.is_accepted ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.score.toFixed(0)}%
              </div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Match Score
              </span>
            </div>
          </div>

          {/* Keywords Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.08] text-xs">
            {/* Matched Keywords */}
            <div className="space-y-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Matched Technologies ({result.matched_keywords.length})</span>
              </span>
              {result.matched_keywords.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No matching keywords found.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {result.matched_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 rounded text-[11px] font-medium border border-emerald-500/30"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Critical Keywords */}
            <div className="space-y-1.5">
              <span className="font-semibold text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Missing Critical ({result.missing_keywords.critical.length})</span>
              </span>
              {result.missing_keywords.critical.length === 0 ? (
                <p className="text-[11px] text-emerald-400 font-medium">All critical skills present!</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {result.missing_keywords.critical.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 bg-rose-950/80 text-rose-300 rounded text-[11px] font-medium border border-rose-500/30"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Multidimensional Component Sub-Scores */}
          {result.breakdown && (
            <div className="pt-2.5 border-t border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                <span>Enterprise Multi-Factor Sub-Scores</span>
                <span className="text-slate-500 font-normal">Deterministic Rubric</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-[#0F172A] p-2 rounded-lg border border-white/[0.08]">
                  <div className="text-[10px] text-slate-400 font-medium">Keywords Overlap</div>
                  <div className="text-sm font-bold text-white tnum">{result.breakdown.keywords}%</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.breakdown.keywords}%` }} />
                  </div>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-lg border border-white/[0.08]">
                  <div className="text-[10px] text-slate-400 font-medium">Skills Coverage</div>
                  <div className="text-sm font-bold text-white tnum">{result.breakdown.skills}%</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.breakdown.skills}%` }} />
                  </div>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-lg border border-white/[0.08]">
                  <div className="text-[10px] text-slate-400 font-medium">Experience Fit</div>
                  <div className="text-sm font-bold text-white tnum">{result.breakdown.experience}%</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.breakdown.experience}%` }} />
                  </div>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-lg border border-white/[0.08]">
                  <div className="text-[10px] text-slate-400 font-medium">Achievements</div>
                  <div className="text-sm font-bold text-white tnum">{result.breakdown.achievements}%</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.breakdown.achievements}%` }} />
                  </div>
                </div>
                <div className="bg-[#0F172A] p-2 rounded-lg border border-white/[0.08]">
                  <div className="text-[10px] text-slate-400 font-medium">Formatting & ATS</div>
                  <div className="text-sm font-bold text-white tnum">{result.breakdown.formatting}%</div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${result.breakdown.formatting}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quantified Achievements Detected */}
          {result.achievements_detected && result.achievements_detected.length > 0 && (
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Quantified Achievements & Metrics ({result.achievements_detected.length} detected)</span>
              </span>
              <div className="space-y-1">
                {result.achievements_detected.slice(0, 4).map((ach, idx) => (
                  <div key={idx} className="text-[11px] p-2 bg-[#0F172A] border border-white/[0.08] rounded-md text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span className="font-mono text-slate-200">{ach.clause}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Improvement Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Actionable ATS Suggestions</span>
              <div className="space-y-1">
                {result.suggestions.map((sug, idx) => (
                  <div key={idx} className="text-[11px] p-2 bg-[#0F172A] border border-white/[0.08] rounded-lg flex items-start gap-2">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 border ${
                      sug.level === 'CRITICAL' ? 'bg-rose-950/80 text-rose-300 border-rose-500/30' :
                      sug.level === 'RECOMMENDED' ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' :
                      'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {sug.level}
                    </span>
                    <span className="text-slate-300 font-medium">{sug.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Decision Action Execution */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <span className="text-[11px] text-slate-400 font-medium">
              Current stage:{' '}
              <strong className="capitalize text-white">{candidate.current_stage}</strong>
            </span>

            <div className="flex items-center gap-2">
              {result.is_accepted ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={screenMutation.isPending}
                  onClick={() => handleRunScreening(true)}
                  className="shadow-sm shadow-emerald-950/40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Accept & Advance to Screening</span>
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  loading={screenMutation.isPending}
                  onClick={() => handleRunScreening(true)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Reject Candidate</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
