import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  AlertCircle,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Tag,
  Globe,
  Link2,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  useCreateCandidate,
  useUpdateCandidate,
  useExtractResumeFile,
  type CandidateRead,
  type CandidateSource,
  type CandidateStage,
} from '../../lib/api';
import { toast } from '../../lib/toast';

const candidateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
  applied_role: z.string().min(1, 'Applied role is required').max(255),
  source: z.enum(['referral', 'linkedin', 'job_board', 'career_site', 'agency', 'other'] as const),
  experience_years: z.coerce.number().min(0).max(70).optional().nullable(),
  skills_input: z.string().optional(),
  resume_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  initial_stage: z.enum(['applied', 'screening', 'interview', 'technical', 'offer', 'hired', 'rejected'] as const).optional(),
});

type FormValues = z.infer<typeof candidateSchema>;

export interface CandidateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateToEdit?: CandidateRead | null;
  onSelectExistingCandidate?: (id: string) => void;
}

export const CandidateFormModal: React.FC<CandidateFormModalProps> = ({
  open,
  onOpenChange,
  candidateToEdit,
  onSelectExistingCandidate,
}) => {
  const isEditing = !!candidateToEdit;
  const createMutation = useCreateCandidate();
  const updateMutation = useUpdateCandidate(candidateToEdit?.id || '');
  const extractResumeMutation = useExtractResumeFile();

  const [conflictCandidateId, setConflictCandidateId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>(candidateToEdit?.resume_text || '');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showResumeTextarea, setShowResumeTextarea] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(candidateSchema),
    mode: 'onBlur',
    values: candidateToEdit
      ? {
          full_name: candidateToEdit.full_name,
          email: candidateToEdit.email,
          phone: candidateToEdit.phone || '',
          location: candidateToEdit.location || '',
          applied_role: candidateToEdit.applied_role,
          source: candidateToEdit.source as CandidateSource,
          experience_years: candidateToEdit.experience_years,
          skills_input: (candidateToEdit.skills || []).join(', '),
          resume_url: candidateToEdit.resume_url || '',
          linkedin_url: candidateToEdit.linkedin_url || '',
          initial_stage: candidateToEdit.current_stage as CandidateStage,
        }
      : {
          full_name: '',
          email: '',
          phone: '',
          location: '',
          applied_role: '',
          source: 'other',
          experience_years: null,
          skills_input: '',
          resume_url: '',
          linkedin_url: '',
          initial_stage: 'applied',
        },
  });

  // Watch skills input to render interactive tag chips
  const watchedSkills = watch('skills_input');

  // Keep resumeText in sync if candidateToEdit changes
  React.useEffect(() => {
    if (candidateToEdit) {
      setResumeText(candidateToEdit.resume_text || '');
    } else {
      setResumeText('');
      setUploadedFileName(null);
    }
  }, [candidateToEdit, open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadedFileName(file.name);
      const res = await extractResumeMutation.mutateAsync(file);
      setResumeText(res.text);

      // Auto-populate or append extracted skills
      const currentSkills = getValues('skills_input')
        ? getValues('skills_input')!.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const mergedSkills = Array.from(new Set([...currentSkills, ...res.extracted_keywords]));
      setValue('skills_input', mergedSkills.join(', '));

      toast.success(`Extracted ${res.extracted_keywords.length} skills from ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract text from resume file');
      setUploadedFileName(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setGeneralError(null);
    setConflictCandidateId(null);

    // Parse comma-separated skills
    const skills = values.skills_input
      ? values.skills_input
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      if (isEditing && candidateToEdit) {
        await updateMutation.mutateAsync({
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || undefined,
          location: values.location || undefined,
          applied_role: values.applied_role,
          source: values.source,
          experience_years: values.experience_years ?? undefined,
          skills,
          resume_text: resumeText || undefined,
          resume_url: values.resume_url || undefined,
          linkedin_url: values.linkedin_url || undefined,
        });
        toast.success('Candidate profile updated');
      } else {
        await createMutation.mutateAsync({
          full_name: values.full_name,
          email: values.email,
          phone: values.phone || undefined,
          location: values.location || undefined,
          applied_role: values.applied_role,
          source: values.source,
          experience_years: values.experience_years ?? undefined,
          skills,
          initial_stage: values.initial_stage ?? null,
          resume_text: resumeText || undefined,
          resume_url: values.resume_url || undefined,
          linkedin_url: values.linkedin_url || undefined,
        });
        toast.success(`Candidate ${values.full_name} added to pipeline`);
      }

      onOpenChange(false);
      reset();
      setResumeText('');
      setUploadedFileName(null);
      setShowResumeTextarea(false);
    } catch (err: any) {
      if (err.status === 409 && err.details?.existing_candidate_id) {
        setConflictCandidateId(err.details.existing_candidate_id);
        setGeneralError('A candidate with this email address already exists in the system.');
      } else {
        setGeneralError(err.message || 'Failed to save candidate. Please verify your inputs.');
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-[#0E1420] border border-white/[0.1] rounded-2xl shadow-2xl focus:outline-none max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.08] bg-[#111827] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25 shrink-0">
                <UserPlus className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white font-display leading-tight">
                  {isEditing ? 'Edit Candidate Profile' : 'Add New Candidate'}
                </Dialog.Title>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEditing
                    ? 'Update candidate identity, requisition alignment, and qualifications.'
                    : 'Enter candidate details, attach resume document, and initialize stage.'}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5 stroke-[1.8]" />
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Error Banner */}
            {generalError && (
              <div
                role="alert"
                className="p-3.5 bg-rose-950/70 text-rose-300 border border-rose-500/30 rounded-xl text-xs flex flex-col gap-1 shadow-sm"
              >
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 stroke-[1.8] text-rose-400" />
                  <span>{generalError}</span>
                </div>
                {conflictCandidateId && onSelectExistingCandidate && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onSelectExistingCandidate(conflictCandidateId);
                    }}
                    className="text-left text-xs text-emerald-400 underline mt-1 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    View existing candidate profile
                  </button>
                )}
              </div>
            )}

            <form id="candidate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section 1: Candidate Identity */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Candidate Identity</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Full Name <span className="text-emerald-400">*</span>
                    </label>
                    <Input
                      {...register('full_name')}
                      icon={<User className="w-4 h-4" />}
                      placeholder="e.g. Alex Morgan"
                      error={!!errors.full_name}
                    />
                    {errors.full_name && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address <span className="text-emerald-400">*</span>
                    </label>
                    <Input
                      type="email"
                      {...register('email')}
                      icon={<Mail className="w-4 h-4" />}
                      placeholder="alex.morgan@example.com"
                      error={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                    <Input
                      {...register('phone')}
                      icon={<Phone className="w-4 h-4" />}
                      placeholder="+1 (555) 234-5678"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location</label>
                    <Input
                      {...register('location')}
                      icon={<MapPin className="w-4 h-4" />}
                      placeholder="San Francisco, CA or Remote"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Requisition & Placement */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Requisition & Milestone</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Applied Role */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Applied Role <span className="text-emerald-400">*</span>
                    </label>
                    <Input
                      {...register('applied_role')}
                      icon={<Briefcase className="w-4 h-4" />}
                      placeholder="e.g. Senior Frontend Engineer"
                      error={!!errors.applied_role}
                    />
                    {errors.applied_role && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{errors.applied_role.message}</p>
                    )}
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Candidate Source</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Tag className="w-4 h-4" />
                      </div>
                      <select
                        {...register('source')}
                        className="w-full bg-[#0E1420] text-slate-100 text-xs sm:text-sm pl-9 pr-9 h-10 rounded-xl border border-white/[0.08] hover:border-white/[0.16] focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all font-medium cursor-pointer appearance-none"
                      >
                        <option value="referral">Internal Referral</option>
                        <option value="linkedin">LinkedIn Recruiter</option>
                        <option value="job_board">Job Board</option>
                        <option value="career_site">Company Career Site</option>
                        <option value="agency">Executive Agency</option>
                        <option value="other">Other / Direct Inbound</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Years of Experience</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="70"
                      {...register('experience_years')}
                      icon={<Clock className="w-4 h-4" />}
                      placeholder="e.g. 5.5"
                    />
                  </div>

                  {/* Initial Stage */}
                  {!isEditing && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Stage</label>
                      <div className="relative">
                        <select
                          {...register('initial_stage')}
                          className="w-full bg-[#0E1420] text-slate-100 text-xs sm:text-sm px-3.5 pr-9 h-10 rounded-xl border border-white/[0.08] hover:border-white/[0.16] focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all font-medium capitalize cursor-pointer appearance-none"
                        >
                          <option value="applied">Applied (Initial Intake)</option>
                          <option value="screening">Screening (ATS Match)</option>
                          <option value="interview">Interview (Recruiter Screen)</option>
                          <option value="technical">Technical Assessment</option>
                          <option value="offer">Offer Extended</option>
                          <option value="hired">Hired (Closed Won)</option>
                          <option value="rejected">Archived / Rejected</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Resume Intelligence & Skills Extraction */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Resume Intelligence & Skills</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Upload Card */}
                <div className="bg-[#151F32] rounded-xl border border-white/[0.08] p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Resume Document (PDF or TXT)</span>
                        <span className="text-[11px] text-slate-400">Upload file for automated text extraction & ATS matching</span>
                      </div>
                    </div>

                    {resumeText && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{resumeText.length.toLocaleString()} chars</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/50 transition-all">
                      {extractResumeMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>
                        {extractResumeMutation.isPending
                          ? 'Extracting keywords...'
                          : uploadedFileName
                          ? 'Replace file'
                          : 'Upload Resume File'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        disabled={extractResumeMutation.isPending}
                        className="hidden"
                      />
                    </label>

                    {uploadedFileName && (
                      <span className="text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-1 rounded-lg truncate max-w-[220px]" title={uploadedFileName}>
                        {uploadedFileName}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowResumeTextarea(!showResumeTextarea)}
                      className="text-xs text-slate-400 hover:text-white underline ml-auto font-medium cursor-pointer"
                    >
                      {showResumeTextarea ? 'Collapse editor' : resumeText ? 'Inspect parsed text' : 'Paste raw resume text'}
                    </button>
                  </div>

                  {showResumeTextarea && (
                    <div className="pt-2 border-t border-white/[0.08] animate-in fade-in duration-150">
                      <textarea
                        rows={5}
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste plain text resume content here..."
                        className="w-full text-xs font-mono p-3 bg-[#0E1420] rounded-xl border border-white/[0.1] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Skills Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Skills & Tech Stack</label>
                    <span className="text-[10px] text-slate-500">Comma-separated</span>
                  </div>
                  <Input
                    {...register('skills_input')}
                    icon={<Tag className="w-4 h-4" />}
                    placeholder="e.g. React, TypeScript, Node.js, Python, PostgreSQL, Docker"
                  />
                  {/* Skill Pill Previews */}
                  {Boolean(watchedSkills) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {watchedSkills!
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 10)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/[0.06]"
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: External URLs */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>External Profiles & Links</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">LinkedIn Profile</label>
                    <Input
                      type="url"
                      {...register('linkedin_url')}
                      icon={<Globe className="w-4 h-4" />}
                      placeholder="https://linkedin.com/in/username"
                      error={!!errors.linkedin_url}
                    />
                    {errors.linkedin_url && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{errors.linkedin_url.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resume / Portfolio URL</label>
                    <Input
                      type="url"
                      {...register('resume_url')}
                      icon={<Link2 className="w-4 h-4" />}
                      placeholder="https://github.com/username or site"
                      error={!!errors.resume_url}
                    />
                    {errors.resume_url && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">{errors.resume_url.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sticky Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#111827] shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-300 rounded border border-white/[0.1] mr-1">
                Esc
              </kbd>
              to cancel
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="candidate-form"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                className="shadow-sm shadow-emerald-950/40"
              >
                {isEditing ? 'Save Changes' : 'Create Candidate'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
