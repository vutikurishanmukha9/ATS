import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ExternalLink,
  Calendar,
  Clock,
  Send,
  Trash2,
  Edit2,
  AlertTriangle,
  Copy,
  Video,
  DollarSign,
  Plus,
  FileCheck,
  Layers,
  Award,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StageBadge, Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Breadcrumbs } from '../ui/breadcrumbs';
import { StatusIndicator } from '../ui/status-indicator';
import {
  useCandidate,
  useCandidateEvents,
  useCandidateNotes,
  useChangeStage,
  useCreateNote,
  useDeleteNote,
  useDeleteCandidate,
  useCandidateInterviews,
  useScheduleInterview,
  useUpdateInterview,
  useCandidateOffer,
  useCreateCandidateOffer,
  type CandidateStage,
} from '../../lib/api';
import { STAGES, SOURCE_LABELS, formatRelativeTime, formatAbsoluteTime, getStageMeta } from '../../lib/tokens';
import { toast } from '../../lib/toast';
import { ScreeningEvaluationCard } from '../screening/screening-evaluation-card';

export interface CandidateDetailPanelProps {
  candidateId: string | null;
  onClose: () => void;
  onEdit: () => void;
}

export const CandidateDetailPanel: React.FC<CandidateDetailPanelProps> = ({
  candidateId,
  onClose,
  onEdit,
}) => {
  const { data: candidate, isLoading: candidateLoading, refetch: refetchCandidate } = useCandidate(candidateId || undefined);
  const { data: events = [], isLoading: eventsLoading } = useCandidateEvents(candidateId || undefined);
  const { data: notes = [], isLoading: notesLoading } = useCandidateNotes(candidateId || undefined);
  const { data: interviews = [] } = useCandidateInterviews(candidateId || undefined);
  const { data: offerData } = useCandidateOffer(candidateId || undefined);

  const changeStageMutation = useChangeStage(candidateId || '');
  const createNoteMutation = useCreateNote(candidateId || '');
  const deleteNoteMutation = useDeleteNote(candidateId || '');
  const deleteCandidateMutation = useDeleteCandidate();
  const scheduleInterviewMutation = useScheduleInterview();
  const updateInterviewMutation = useUpdateInterview();
  const createOfferMutation = useCreateCandidateOffer();

  // Active Tab: 'overview' | 'screening' | 'interviews' | 'scorecard' | 'offer' | 'timeline' | 'notes' | 'comms'
  const [activeTab, setActiveTab] = useState<'overview' | 'screening' | 'interviews' | 'scorecard' | 'offer' | 'timeline' | 'notes' | 'comms'>('overview');
  const [commTemplate, setCommTemplate] = useState<'interview' | 'update' | 'offer' | 'rejection'>('interview');
  const [isLoggingComm, setIsLoggingComm] = useState(false);

  // Interview Schedule state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [roundType, setRoundType] = useState('Technical Round 1');
  const [roundTitle, setRoundTitle] = useState('System Architecture & Coding');
  const [interviewerName, setInterviewerName] = useState('Sarah Chen');
  const [interviewerEmail, setInterviewerEmail] = useState('sarah.chen@company.com');
  const [scheduledDate, setScheduledDate] = useState('2026-10-22T14:00');
  const [durationMins, setDurationMins] = useState(45);
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/ats-crackit-tech');

  // Interview Evaluation scorecard modal state
  const [evaluatingRoundId, setEvaluatingRoundId] = useState<string | null>(null);
  const [roundRating, setRoundRating] = useState<number>(4);
  const [roundFeedback, setRoundFeedback] = useState('');

  // Offer Package state
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerBase, setOfferBase] = useState<number>(145000);
  const [offerBonus, setOfferBonus] = useState<number>(15);
  const [offerEquity, setOfferEquity] = useState<number>(4500);
  const [offerCurrency, setOfferCurrency] = useState('USD');
  const [offerStartDate, setOfferStartDate] = useState('2026-11-15');
  const [offerExpiryDate, setOfferExpiryDate] = useState('2026-11-05');
  const [offerNotes, setOfferNotes] = useState('Includes health coverage and flexible time off.');

  // Stage change state
  const [selectedStage, setSelectedStage] = useState<CandidateStage | ''>('');
  const [stageReason, setStageReason] = useState('');
  const [confirmStageChange, setConfirmStageChange] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Note state
  const [newNoteBody, setNewNoteBody] = useState('');

  // Structured Candidate Intelligence / Parsed Profile
  const matchDetails = React.useMemo(() => {
    if (!candidate?.match_details) return null;
    try {
      return JSON.parse(candidate.match_details);
    } catch {
      return null;
    }
  }, [candidate?.match_details]);

  // Structured Scorecard state
  const [scorecardRec, setScorecardRec] = useState<'strong_yes' | 'yes' | 'no' | 'strong_no'>('yes');
  const [techRating, setTechRating] = useState<number>(4);
  const [problemRating, setProblemRating] = useState<number>(4);
  const [commRating, setCommRating] = useState<number>(4);
  const [scorecardNotes, setScorecardNotes] = useState('');
  const [isSubmittingScorecard, setIsSubmittingScorecard] = useState(false);

  // Delete candidate confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!candidateId) return null;

  const handleStageSelectChange = (newStage: CandidateStage) => {
    setSelectedStage(newStage);
    setStageError(null);

    const currentIsTerminal =
      candidate?.current_stage === 'hired' || candidate?.current_stage === 'rejected';
    const targetIsTerminal = newStage === 'hired' || newStage === 'rejected';

    if (currentIsTerminal || targetIsTerminal) {
      setConfirmStageChange(true);
    } else {
      executeStageChange(newStage, '');
    }
  };

  const executeStageChange = async (targetStage: CandidateStage, reasonText: string) => {
    setStageError(null);
    try {
      await changeStageMutation.mutateAsync({
        to_stage: targetStage,
        reason: reasonText.trim() || undefined,
      });
      toast.success(`Candidate moved to ${getStageMeta(targetStage).label}`);
      setConfirmStageChange(false);
      setStageReason('');
      setSelectedStage('');
    } catch (err: any) {
      setStageError(err.message || 'Failed to update stage');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim()) return;
    try {
      await createNoteMutation.mutateAsync({ body: newNoteBody.trim() });
      toast.success('Internal note saved');
      setNewNoteBody('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await deleteCandidateMutation.mutateAsync(candidateId!);
      toast.info('Candidate deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete candidate');
    }
  };

  const handleSubmitScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingScorecard(true);
    const recLabels = {
      strong_yes: 'STRONG YES',
      yes: 'YES',
      no: 'NO',
      strong_no: 'STRONG NO',
    };
    const body = `[INTERVIEW SCORECARD - ${recLabels[scorecardRec]}]\nOverall Recommendation: ${recLabels[scorecardRec]}\nTechnical Skills: ${techRating}/5\nProblem Solving: ${problemRating}/5\nCommunication: ${commRating}/5\n\nEvaluation Notes:\n${scorecardNotes || 'Candidate demonstrated strong technical alignment with requirements.'}`;

    try {
      await createNoteMutation.mutateAsync({ body });
      toast.success('Interview scorecard saved');
      setScorecardNotes('');
      setActiveTab('notes');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit scorecard');
    } finally {
      setIsSubmittingScorecard(false);
    }
  };

  const handleScheduleInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    try {
      await scheduleInterviewMutation.mutateAsync({
        candidateId,
        payload: {
          round_type: roundType,
          title: roundTitle,
          interviewer_name: interviewerName,
          interviewer_email: interviewerEmail,
          scheduled_at: scheduledDate,
          duration_minutes: Number(durationMins),
          meeting_link: meetingLink,
        },
      });
      toast.success(`${roundType} scheduled successfully`);
      setScheduleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule interview round');
    }
  };

  const handleCompleteInterview = async (interviewId: string) => {
    if (!candidateId) return;
    try {
      await updateInterviewMutation.mutateAsync({
        candidateId,
        interviewId,
        payload: {
          status: 'completed',
          rating: roundRating,
          scorecard_notes: roundFeedback.trim() || undefined,
        },
      });
      toast.success('Interview round completed and scorecard logged');
      setEvaluatingRoundId(null);
      setRoundFeedback('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to log interview scorecard');
    }
  };

  const handleCreateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;
    try {
      await createOfferMutation.mutateAsync({
        candidateId,
        payload: {
          base_salary: Number(offerBase),
          bonus_percentage: Number(offerBonus),
          equity_shares: Number(offerEquity),
          currency: offerCurrency,
          start_date: offerStartDate,
          expiration_date: offerExpiryDate,
          notes: offerNotes || undefined,
        },
      });
      toast.success('Formal employment offer generated & extended');
      setOfferModalOpen(false);
      refetchCandidate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate offer package');
    }
  };

  return (
    <Dialog.Root open={!!candidateId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl lg:max-w-3xl bg-[#0B0F17] border-l border-white/[0.08] shadow-2xl flex flex-col focus:outline-none overflow-hidden animate-in slide-in-from-right duration-200"
        >
          {/* Header with Canvas Kit Breadcrumbs & Status Indicator */}
          <div className="px-5 sm:px-7 py-3.5 border-b border-white/[0.08] bg-[#111827] shrink-0">
            {/* Breadcrumb Trail */}
            <div className="mb-2">
              <Breadcrumbs
                items={[
                  { label: 'Candidates', onClick: onClose },
                  { label: candidate?.applied_role || 'General' },
                  { label: candidate?.full_name || 'Dossier' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <Dialog.Title className="text-base font-bold text-white font-display">
                    {candidate?.full_name || 'Candidate Dossier'}
                  </Dialog.Title>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-300">{candidate?.applied_role}</span>
                    {candidate?.match_score !== null && candidate?.match_score !== undefined && (
                      <>
                        <span>•</span>
                        <StatusIndicator
                          type={candidate.match_score >= 60 ? 'success' : 'danger'}
                          emphasis="low"
                          pulse={candidate.match_score >= 80}
                          className="font-mono text-[11px]"
                        >
                          {Math.round(candidate.match_score)}% ATS Match
                        </StatusIndicator>
                      </>
                    )}
                  </div>
                </div>
                {candidate && <StageBadge stage={candidate.current_stage} size="md" />}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Edit</span>
                </Button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-5 w-5 stroke-[1.8]" />
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </div>

          {/* Candidate Detail Tabs */}
          {candidate && (
            <div className="flex border-b border-white/[0.08] bg-[#0B0F17] px-5 sm:px-7 shrink-0 gap-1 overflow-x-auto text-xs font-semibold select-none">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('screening')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'screening'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Resume & Match</span>
                {candidate.match_score !== null && candidate.match_score !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                      candidate.match_score >= 60
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {Math.round(candidate.match_score)}%
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('interviews')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'interviews'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Interviews</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold tnum border border-white/[0.08]">
                  {interviews.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scorecard')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'scorecard'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                Scorecard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('offer')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'offer'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Offer Package</span>
                {offerData && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold">
                    Extended
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'timeline'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Audit Timeline</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold tnum border border-white/[0.08]">
                  {events.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'notes'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Notes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold tnum border border-white/[0.08]">
                  {notes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comms')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'comms'
                    ? 'border-emerald-500 text-emerald-400 bg-[#111827] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>Communications</span>
              </button>
            </div>
          )}

          {/* Panel Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
            {candidateLoading || !candidate ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4 rounded-xl" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Contact & Bio Card */}
                    <div className="bg-[#111827] p-5 border border-white/[0.08] rounded-2xl space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center justify-between gap-2 bg-[#151F32] px-3 py-2 rounded-xl border border-white/[0.06]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <a href={`mailto:${candidate.email}`} className="text-xs text-emerald-400 hover:underline truncate font-medium">
                              {candidate.email}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(candidate.email);
                              toast.info('Email copied to clipboard');
                            }}
                            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                            title="Copy email"
                          >
                            <Copy className="h-3 w-3 stroke-[1.8]" />
                          </button>
                        </div>

                        {candidate.phone && (
                          <div className="flex items-center justify-between gap-2 bg-[#151F32] px-3 py-2 rounded-xl border border-white/[0.06]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="text-xs text-slate-200 font-medium truncate">{candidate.phone}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(candidate.phone!);
                                toast.info('Phone copied to clipboard');
                              }}
                              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              title="Copy phone number"
                            >
                              <Copy className="h-3 w-3 stroke-[1.8]" />
                            </button>
                          </div>
                        )}

                        {candidate.location && (
                          <div className="flex items-center gap-2 text-slate-300 bg-[#151F32] px-3 py-2 rounded-xl border border-white/[0.06]">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="font-medium">{candidate.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-slate-300 bg-[#151F32] px-3 py-2 rounded-xl border border-white/[0.06]">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="font-medium">{SOURCE_LABELS[candidate.source as keyof typeof SOURCE_LABELS] || candidate.source}</span>
                        </div>

                        {candidate.experience_years !== null && candidate.experience_years !== undefined && (
                          <div className="flex items-center gap-2 text-slate-300 bg-[#151F32] px-3 py-2 rounded-xl border border-white/[0.06] col-span-full">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="font-medium">{candidate.experience_years} years of relevant experience</span>
                          </div>
                        )}
                      </div>

                      {/* External Links */}
                      {(candidate.resume_url || candidate.linkedin_url) && (
                        <div className="flex items-center gap-3 pt-2.5 border-t border-white/[0.08]">
                          {candidate.resume_url && (
                            <a
                              href={candidate.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>View External Resume</span>
                            </a>
                          )}
                          {candidate.linkedin_url && (
                            <a
                              href={candidate.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>LinkedIn Profile</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Uniform Parsed Candidate Profile Card */}
                    <div className="bg-[#111827] p-5 border border-white/[0.08] rounded-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                            Uniform Parsed Profile
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Automated NLP Extraction
                        </span>
                      </div>

                      {/* Technical Skills & Competencies */}
                      {(() => {
                        const skillsList = candidate.skills || [];
                        return (
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-300 block">
                              Core Competencies & Stack ({skillsList.length} skills indexed)
                            </span>
                            {skillsList.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No skills indexed yet. Evaluate resume to populate.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {skillsList.map((skill) => (
                                  <span
                                    key={skill}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-white/[0.08] hover:bg-slate-700 transition-colors"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Quantified Achievements (if extracted) */}
                      {matchDetails?.achievements_detected && matchDetails.achievements_detected.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                            <Award className="w-3.5 h-3.5 text-emerald-400" />
                            <span>High-Impact Measurable Achievements</span>
                          </div>
                          <div className="space-y-1.5">
                            {matchDetails.achievements_detected.slice(0, 3).map((ach: any, idx: number) => {
                              const clauseText = typeof ach === 'string' ? ach : (ach.clause || JSON.stringify(ach));
                              const verb = typeof ach === 'object' && ach.verb ? `[${ach.verb.toUpperCase()}] ` : '';
                              return (
                                <div key={idx} className="text-xs bg-[#151F32] p-2.5 rounded-xl border border-white/[0.06] text-slate-300 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                  <span className="font-mono text-[11px] leading-relaxed">
                                    {verb && <strong className="text-emerald-400">{verb}</strong>}
                                    {clauseText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Detected Section Architecture */}
                      <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[11px] text-slate-400 font-semibold">Indexed Sections:</span>
                        {['Experience', 'Education', 'Skills', 'Projects'].map((sec) => (
                          <span
                            key={sec}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{sec}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Hiring Stage Mover */}
                    <div className="bg-[#111827] p-4 sm:p-5 border border-white/[0.08] rounded-2xl space-y-3.5">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hiring Pipeline Stage</h3>

                      {stageError && (
                        <div className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-500/30">
                          {stageError}
                        </div>
                      )}

                      {!confirmStageChange ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {STAGES.map((s) => {
                            const isCurrent = candidate.current_stage === s.key;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                disabled={isCurrent || changeStageMutation.isPending}
                                onClick={() => handleStageSelectChange(s.key)}
                                className={`px-2.5 py-2 text-xs font-semibold rounded-xl border transition-all select-none cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                                  isCurrent
                                    ? `${s.bgClass} ${s.textClass} border-emerald-500 ring-1 ring-emerald-500/30 cursor-default shadow-xs`
                                    : 'bg-[#151F32] hover:bg-slate-800 text-slate-300 border-white/[0.08] hover:border-white/[0.16]'
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 bg-[#151F32] border border-white/[0.08] rounded-xl space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white">
                            <AlertTriangle className="h-4 w-4 text-amber-400 stroke-[1.8]" />
                            <span>Confirm transition to <strong className="capitalize text-emerald-400">{selectedStage}</strong></span>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              {selectedStage === 'rejected'
                                ? 'Rejection reason'
                                : candidate.current_stage === 'rejected' || candidate.current_stage === 'hired'
                                ? 'Reopen reason (required)'
                                : 'Reason or notes (optional)'}
                            </label>
                            <Input
                              value={stageReason}
                              onChange={(e) => setStageReason(e.target.value)}
                              placeholder="Provide context for this transition..."
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConfirmStageChange(false);
                                setStageReason('');
                                setSelectedStage('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              loading={changeStageMutation.isPending}
                              onClick={() => executeStageChange(selectedStage as CandidateStage, stageReason)}
                              className="shadow-sm shadow-emerald-950/40"
                            >
                              Confirm move
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Candidate Skills */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Skills</h3>
                      {candidate.skills && candidate.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.skills.map((skill) => (
                            <Badge key={skill} variant="neutral">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No skills listed for this candidate.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: RESUME & SCREENING */}
                {activeTab === 'screening' && (
                  <div className="space-y-4">
                    <ScreeningEvaluationCard
                      candidate={candidate}
                      onCandidateUpdated={() => {
                        refetchCandidate();
                      }}
                    />
                  </div>
                )}

                {/* TAB: INTERVIEWS (Scheduling & Evaluation Rounds) */}
                {activeTab === 'interviews' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                          Interview Rounds & Evaluations
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Multi-stage structured interview loop and stage milestones.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setScheduleModalOpen(true)}
                        className="shadow-sm shadow-emerald-950/40"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Schedule Round</span>
                      </Button>
                    </div>

                    {interviews.length === 0 ? (
                      <div className="p-8 text-center bg-[#111827] border border-dashed border-white/[0.1] rounded-2xl space-y-3">
                        <Video className="w-8 h-8 mx-auto text-slate-500 stroke-[1.5]" />
                        <p className="text-xs text-slate-300 font-medium">No interview rounds scheduled yet.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScheduleModalOpen(true)}
                        >
                          Schedule 1st Technical Interview
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {interviews.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 bg-[#111827] border rounded-xl space-y-3 transition-all ${
                              item.status === 'completed'
                                ? 'border-emerald-500/30 bg-emerald-950/15'
                                : 'border-white/[0.08]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white font-display">
                                    {item.round_type}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                      item.status === 'completed'
                                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                                        : item.status === 'cancelled'
                                        ? 'bg-slate-800 text-slate-400 border-white/[0.08]'
                                        : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                  {item.rating && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono">
                                      <span>Score: {item.rating}/5</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-300 font-medium mt-0.5">{item.title}</p>
                              </div>

                              {item.status === 'scheduled' && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEvaluatingRoundId(item.id);
                                      setRoundFeedback(item.scorecard_notes || '');
                                      setRoundRating(item.rating || 4);
                                    }}
                                  >
                                    <span>Log Scorecard</span>
                                  </Button>
                                  <a
                                    href={item.meeting_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/40 cursor-pointer"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Join Call</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/[0.08] text-[11px] text-slate-300">
                              <div>
                                <span className="text-slate-500 block">Interviewer</span>
                                <span className="font-semibold text-slate-200">{item.interviewer_name}</span>
                                <span className="text-slate-400 text-[10px] block">{item.interviewer_email}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Scheduled Time</span>
                                <span className="font-semibold text-slate-200">{item.scheduled_at}</span>
                                <span className="text-slate-400 text-[10px] block">{item.duration_minutes} Minutes</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Meeting Room</span>
                                <a
                                  href={item.meeting_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-emerald-400 hover:underline truncate block"
                                >
                                  {item.meeting_link}
                                </a>
                              </div>
                            </div>

                            {item.scorecard_notes && (
                              <div className="p-2.5 bg-[#151F32] border border-white/[0.08] rounded-lg text-xs text-slate-300">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                  Interviewer Scorecard Debrief:
                                </span>
                                <p className="italic">{item.scorecard_notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: SCORECARD (Enterprise Evaluation) */}
                {activeTab === 'scorecard' && (
                  <div className="space-y-5">
                    <div className="bg-[#111827] p-5 border border-white/[0.08] rounded-2xl space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white font-display">Structured Interview Evaluation</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enterprise rubric score and hiring recommendation for {candidate.full_name}.
                        </p>
                      </div>

                      <form onSubmit={handleSubmitScorecard} className="space-y-4">
                        {/* Overall Recommendation Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Overall Recommendation
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { key: 'strong_yes', label: 'Strong Yes', color: 'border-emerald-500 bg-emerald-950/80 text-emerald-300' },
                              { key: 'yes', label: 'Yes', color: 'border-emerald-500/70 bg-emerald-950/50 text-emerald-400' },
                              { key: 'no', label: 'No', color: 'border-rose-500/70 bg-rose-950/50 text-rose-400' },
                              { key: 'strong_no', label: 'Strong No', color: 'border-rose-500 bg-rose-950/80 text-rose-300' },
                            ].map((rec) => (
                              <button
                                key={rec.key}
                                type="button"
                                onClick={() => setScorecardRec(rec.key as any)}
                                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                                  scorecardRec === rec.key
                                    ? `${rec.color} ring-2 ring-emerald-500/20`
                                    : 'border-white/[0.08] bg-[#151F32] text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {rec.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Competency Ratings (1 to 5) */}
                        <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slate-200">Technical Execution & Skills</span>
                              <p className="text-[11px] text-slate-400">Mastery of role-specific tech stack and coding quality</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setTechRating(star)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                    techRating >= star
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slate-200">Problem Solving & Architecture</span>
                              <p className="text-[11px] text-slate-400">System design, algorithmic efficiency, debugging</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setProblemRating(star)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                    problemRating >= star
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slate-200">Communication & Team Collaboration</span>
                              <p className="text-[11px] text-slate-400">Clarity of thought, empathy, stakeholder alignment</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setCommRating(star)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                    commRating >= star
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Interview Feedback & Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Debrief Notes & Key Observations
                          </label>
                          <textarea
                            rows={3}
                            value={scorecardNotes}
                            onChange={(e) => setScorecardNotes(e.target.value)}
                            placeholder="Detail strengths, gaps, and specific project examples discussed..."
                            className="w-full text-xs p-3 bg-[#0F172A] border border-white/[0.1] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            loading={isSubmittingScorecard}
                          >
                            Submit Scorecard
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB: OFFER PACKAGE & LETTER (Executive Compensation) */}
                {activeTab === 'offer' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                          Candidate Offer Package & Employment Letter
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Executive compensation structuring and automated contract generation.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setOfferModalOpen(true)}
                        className="shadow-sm shadow-emerald-950/40"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                        <span>{offerData ? 'Edit Offer Package' : 'Create Offer Package'}</span>
                      </Button>
                    </div>

                    {offerData ? (
                      <div className="space-y-4">
                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-[#111827] border border-white/[0.08] rounded-xl">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Annual Base</span>
                            <span className="font-display text-lg font-black text-white tnum">
                              {offerData.currency} {offerData.base_salary?.toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 bg-[#111827] border border-white/[0.08] rounded-xl">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Annual Bonus</span>
                            <span className="font-display text-lg font-black text-emerald-400 tnum">
                              {offerData.bonus_percentage}%
                            </span>
                          </div>
                          <div className="p-3 bg-[#111827] border border-white/[0.08] rounded-xl">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Equity / RSUs</span>
                            <span className="font-display text-lg font-black text-white tnum">
                              {offerData.equity_shares?.toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 bg-[#111827] border border-white/[0.08] rounded-xl">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Target Start</span>
                            <span className="font-display text-sm font-bold text-slate-200 tnum mt-1 block">
                              {offerData.start_date}
                            </span>
                          </div>
                        </div>

                        {/* Offer Letter Document Preview */}
                        <div className="p-5 bg-[#111827] border border-white/[0.08] rounded-2xl space-y-3">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-white font-display">
                                Official Offer Letter Preview
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(offerData.letter_markdown);
                                toast.success('Offer letter markdown copied to clipboard');
                              }}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" />
                              <span>Copy Letter</span>
                            </Button>
                          </div>
                          <div className="p-4 bg-[#0F172A] border border-white/[0.08] rounded-xl font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                            {offerData.letter_markdown}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-[#111827] border border-dashed border-white/[0.1] rounded-2xl space-y-3">
                        <DollarSign className="w-8 h-8 mx-auto text-slate-500 stroke-[1.5]" />
                        <p className="text-xs text-slate-300 font-medium">No formal offer extended to this candidate yet.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOfferModalOpen(true)}
                        >
                          Generate Official Offer Package
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: AUDIT TIMELINE */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Stage Event History & Audit Log</h3>
                    <div className="space-y-3">
                      {eventsLoading ? (
                        <Skeleton className="h-16 w-full rounded-xl" />
                      ) : events.length === 0 ? (
                        <p className="text-xs text-slate-500">No events recorded.</p>
                      ) : (
                        <ol className="relative border-l border-white/[0.1] ml-2 space-y-3.5">
                          {events.map((event) => (
                            <li key={event.id} className="ml-4">
                              <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-[#0B0F17] bg-emerald-500" />
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-200">
                                  {event.from_stage ? (
                                    <>
                                      Moved from <strong className="capitalize">{event.from_stage}</strong> to{' '}
                                      <strong className="capitalize text-emerald-400">{event.to_stage}</strong>
                                    </>
                                  ) : (
                                    <>
                                      Applied as <strong className="capitalize text-emerald-400">{event.to_stage}</strong>
                                    </>
                                  )}
                                </span>
                                <span
                                  title={formatAbsoluteTime(event.created_at)}
                                  className="text-slate-500 flex items-center gap-1 cursor-help tnum"
                                >
                                  <Clock className="h-3 w-3" />
                                  {formatRelativeTime(event.created_at)}
                                </span>
                              </div>
                              {event.reason && (
                                <p className="text-xs text-slate-400 italic mt-0.5">
                                  Reason: "{event.reason}"
                                </p>
                              )}
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                by {event.changer_name || 'System / Recruiter'}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: NOTES */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Internal Recruiter Notes</h3>
                      <span className="text-xs text-slate-400 tnum font-medium">{notes.length} notes</span>
                    </div>

                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        value={newNoteBody}
                        onChange={(e) => setNewNoteBody(e.target.value)}
                        placeholder="Add an internal note or interview debrief..."
                        rows={2}
                        className="w-full bg-[#0F172A] text-slate-100 text-xs p-3 rounded-xl border border-white/[0.1] hover:border-white/[0.2] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-all placeholder:text-slate-500"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={!newNoteBody.trim()}
                          loading={createNoteMutation.isPending}
                          className="shadow-sm shadow-emerald-950/40"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          <span>Add note</span>
                        </Button>
                      </div>
                    </form>

                    {/* Notes List */}
                    <div className="space-y-2.5">
                      {notesLoading ? (
                        <Skeleton className="h-16 w-full rounded-xl" />
                      ) : notes.length === 0 ? (
                        <p className="text-xs text-slate-500 py-1">No notes added yet.</p>
                      ) : (
                        notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3.5 bg-[#111827] border border-white/[0.08] rounded-xl space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-semibold text-slate-200">{note.author_name || 'Recruiter'}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  title={formatAbsoluteTime(note.created_at)}
                                  className="cursor-help tnum"
                                >
                                  {formatRelativeTime(note.created_at)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteNoteMutation.mutate(note.id);
                                    toast.info('Note removed');
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{note.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 6: COMMUNICATIONS & INVITES (Candidate Outreach) */}
                {activeTab === 'comms' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Candidate Communications & Email Invites
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Standardized institutional messaging templates for candidate touchpoints.
                        </p>
                      </div>
                      <span className="text-xs text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-semibold">
                        Enterprise Format
                      </span>
                    </div>

                    {/* Template Picker */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'interview', label: 'Technical Invite' },
                        { key: 'update', label: 'Stage Progress' },
                        { key: 'offer', label: 'Offer Notice' },
                        { key: 'rejection', label: 'Polite Rejection' },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setCommTemplate(t.key as any)}
                          className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                            commTemplate === t.key
                              ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300'
                              : 'border-white/[0.08] bg-[#151F32] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Pre-populated Email Preview Card */}
                    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Subject Line
                        </label>
                        <div className="p-2.5 bg-[#0F172A] border border-white/[0.08] rounded-xl text-xs text-slate-200 font-medium">
                          {commTemplate === 'interview' && `Technical Interview Invitation: ${candidate.applied_role} at Crack it`}
                          {commTemplate === 'update' && `Update on your application for ${candidate.applied_role} at Crack it`}
                          {commTemplate === 'offer' && `Offer of Employment: ${candidate.applied_role} at Crack it`}
                          {commTemplate === 'rejection' && `Update regarding your application for ${candidate.applied_role} at Crack it`}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Message Body (Sent to {candidate.email})
                        </label>
                        <textarea
                          readOnly
                          rows={8}
                          value={
                            commTemplate === 'interview'
                              ? `Hi ${candidate.full_name},\n\nThank you for applying for the ${candidate.applied_role} role at Crack it. After reviewing your resume and technical qualifications, our hiring team would like to invite you to a 45-minute technical video interview.\n\nDuring this session, we will discuss:\n- Your project architecture and technical execution\n- Coding & problem-solving walkthrough\n- Questions you have for our engineering team\n\nPlease reply with your preferred time slots over the coming days.\n\nBest regards,\nRecruiting Team\nCrack it`
                              : commTemplate === 'update'
                              ? `Hi ${candidate.full_name},\n\nWe wanted to share an update on your candidacy for ${candidate.applied_role}. Your profile has been moved to the ${getStageMeta(candidate.current_stage).label} stage.\n\nOur team is coordinating the next steps and will be in touch with detailed scheduling information soon.\n\nBest regards,\nCrack it Hiring Team`
                              : commTemplate === 'offer'
                              ? `Dear ${candidate.full_name},\n\nOn behalf of Crack it, we are thrilled to offer you the position of ${candidate.applied_role}!\n\nOur entire interview loop was impressed by your skills, collaborative mindset, and technical excellence. We believe you will do phenomenal work here.\n\nPlease find your formal offer summary attached. Let us know if you have any questions.\n\nWarmly,\nPeople & Talent Team\nCrack it`
                              : `Hi ${candidate.full_name},\n\nThank you for investing your time in applying and interviewing with us for the ${candidate.applied_role} position.\n\nWhile our team appreciated learning about your experience, we have decided to move forward with other candidates whose skillsets more closely match our current requirements.\n\nWe will keep your resume on file for future openings and wish you continued success in your career.\n\nSincerely,\nRecruiting Team\nCrack it`
                          }
                          className="w-full text-xs p-3 bg-[#0F172A] border border-white/[0.08] rounded-xl text-slate-200 leading-relaxed font-sans focus:outline-none"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const body =
                              commTemplate === 'interview'
                                ? `Hi ${candidate.full_name},\n\nThank you for applying for the ${candidate.applied_role} role at Crack it. After reviewing your resume and technical qualifications, our hiring team would like to invite you to a 45-minute technical video interview.\n\nDuring this session, we will discuss:\n- Your project architecture and technical execution\n- Coding & problem-solving walkthrough\n- Questions you have for our engineering team\n\nPlease reply with your preferred time slots over the coming days.\n\nBest regards,\nRecruiting Team\nCrack it`
                                : commTemplate === 'update'
                                ? `Hi ${candidate.full_name},\n\nWe wanted to share an update on your candidacy for ${candidate.applied_role}. Your profile has been moved to the ${getStageMeta(candidate.current_stage).label} stage.\n\nOur team is coordinating the next steps and will be in touch with detailed scheduling information soon.\n\nBest regards,\nCrack it Hiring Team`
                                : commTemplate === 'offer'
                                ? `Dear ${candidate.full_name},\n\nOn behalf of Crack it, we are thrilled to offer you the position of ${candidate.applied_role}!\n\nOur entire interview loop was impressed by your skills, collaborative mindset, and technical excellence. We believe you will do phenomenal work here.\n\nPlease find your formal offer summary attached. Let us know if you have any questions.\n\nWarmly,\nPeople & Talent Team\nCrack it`
                                : `Hi ${candidate.full_name},\n\nThank you for investing your time in applying and interviewing with us for the ${candidate.applied_role} position.\n\nWhile our team appreciated learning about your experience, we have decided to move forward with other candidates whose skillsets more closely match our current requirements.\n\nWe will keep your resume on file for future openings and wish you continued success in your career.\n\nSincerely,\nRecruiting Team\nCrack it`;
                            navigator.clipboard.writeText(body);
                            toast.success('Email template copied to clipboard');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          <span>Copy Template</span>
                        </Button>

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={isLoggingComm}
                          onClick={async () => {
                            setIsLoggingComm(true);
                            const templateName = {
                              interview: 'Technical Interview Invitation',
                              update: 'Stage Progress Update',
                              offer: 'Offer Letter Notice',
                              rejection: 'Polite Rejection Notice',
                            }[commTemplate];

                            try {
                              await createNoteMutation.mutateAsync({
                                body: `[CANDIDATE COMMUNICATION SENT - ${templateName}]\nRecipient: ${candidate.email}\nSubject: ${
                                  commTemplate === 'interview'
                                    ? `Technical Interview Invitation: ${candidate.applied_role}`
                                    : commTemplate === 'update'
                                    ? `Update on your application for ${candidate.applied_role}`
                                    : commTemplate === 'offer'
                                    ? `Offer of Employment: ${candidate.applied_role}`
                                    : `Application Update: ${candidate.applied_role}`
                                }\nStatus: Successfully logged by Recruiter`,
                              });
                              toast.success(`Logged "${templateName}" to candidate history`);
                              setActiveTab('timeline');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to log communication');
                            } finally {
                              setIsLoggingComm(false);
                            }
                          }}
                          className="shadow-sm shadow-emerald-950/40"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          <span>Log to Audit History</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Danger Zone: Delete Candidate */}
                <div className="pt-4 border-t border-white/[0.08]">
                  {!confirmDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete candidate record</span>
                    </Button>
                  ) : (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-2.5">
                      <p className="text-xs font-semibold text-rose-300">
                        Are you sure you want to delete this candidate? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deleteCandidateMutation.isPending}
                          onClick={handleDeleteCandidate}
                        >
                          Confirm delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Modal 1: Schedule Interview Round */}
          {scheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-lg bg-[#111827] rounded-2xl border border-white/[0.12] shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Schedule Interview Round</h3>
                    <p className="text-xs text-slate-400">Configure round type, interviewer, and meeting room.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Round Type *</label>
                      <select
                        value={roundType}
                        onChange={(e) => {
                          setRoundType(e.target.value);
                          if (e.target.value === 'Screening Call') setRoundTitle('Recruiter Screening Call');
                          if (e.target.value === 'Technical Round 1') setRoundTitle('Coding & Architecture Assessment');
                          if (e.target.value === 'System Design') setRoundTitle('Distributed Systems & Architecture');
                          if (e.target.value === 'Culture Fit') setRoundTitle('Values & Collaborative Fit');
                          if (e.target.value === 'Hiring Manager') setRoundTitle('Executive Leadership Alignment');
                        }}
                        className="w-full text-xs p-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="Screening Call">Screening Call</option>
                        <option value="Technical Round 1">Technical Round 1</option>
                        <option value="System Design">System Design</option>
                        <option value="Culture Fit">Culture & Values Fit</option>
                        <option value="Hiring Manager">Hiring Manager Debrief</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Duration *</label>
                      <select
                        value={durationMins}
                        onChange={(e) => setDurationMins(Number(e.target.value))}
                        className="w-full text-xs p-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes (Standard)</option>
                        <option value={60}>60 Minutes (Deep Dive)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Round Title *</label>
                    <Input
                      value={roundTitle}
                      onChange={(e) => setRoundTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Interviewer Name *</label>
                      <Input
                        value={interviewerName}
                        onChange={(e) => setInterviewerName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Interviewer Email *</label>
                      <Input
                        type="email"
                        value={interviewerEmail}
                        onChange={(e) => setInterviewerEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Date & Time *</label>
                      <Input
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Room URL *</label>
                      <Input
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduleModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={scheduleInterviewMutation.isPending}
                    >
                      Schedule Round & Record Event
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: Log Interview Scorecard */}
          {evaluatingRoundId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-white/[0.12] shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Log Interview Scorecard</h3>
                    <p className="text-xs text-slate-400">Record final candidate score and debrief notes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvaluatingRoundId(null)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Round Score (Scale: 1 to 5)</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setRoundRating(score)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono transition-all cursor-pointer ${
                            roundRating === score
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Debrief & Candidate Feedback *</label>
                    <textarea
                      rows={4}
                      value={roundFeedback}
                      onChange={(e) => setRoundFeedback(e.target.value)}
                      placeholder="Detail candidate's problem-solving depth, architecture skills, and response quality..."
                      className="w-full text-xs p-3 bg-[#0F172A] border border-white/[0.1] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEvaluatingRoundId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={updateInterviewMutation.isPending}
                      onClick={() => handleCompleteInterview(evaluatingRoundId)}
                    >
                      Submit Scorecard & Complete Round
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal 3: Create / Edit Offer Package */}
          {offerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-lg bg-[#111827] rounded-2xl border border-white/[0.12] shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Configure Offer Package</h3>
                    <p className="text-xs text-slate-400">Corporate compensation structuring for {candidate?.full_name}.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOfferModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateOfferSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Annual Base Salary *</label>
                      <Input
                        type="number"
                        value={offerBase}
                        onChange={(e) => setOfferBase(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Currency *</label>
                      <select
                        value={offerCurrency}
                        onChange={(e) => setOfferCurrency(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#0F172A] border border-white/[0.1] rounded-lg text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Target Annual Bonus (%)</label>
                      <Input
                        type="number"
                        value={offerBonus}
                        onChange={(e) => setOfferBonus(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Equity / RSUs (Shares)</label>
                      <Input
                        type="number"
                        value={offerEquity}
                        onChange={(e) => setOfferEquity(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Target Start Date *</label>
                      <Input
                        type="date"
                        value={offerStartDate}
                        onChange={(e) => setOfferStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Offer Expiration Date *</label>
                      <Input
                        type="date"
                        value={offerExpiryDate}
                        onChange={(e) => setOfferExpiryDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Terms & Notes</label>
                    <textarea
                      rows={2}
                      value={offerNotes}
                      onChange={(e) => setOfferNotes(e.target.value)}
                      placeholder="Sign-on bonus, relocation assistance, special clauses..."
                      className="w-full text-xs p-2.5 bg-[#0F172A] border border-white/[0.1] rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOfferModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={createOfferMutation.isPending}
                    >
                      Generate Official Offer Letter & Extend
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
