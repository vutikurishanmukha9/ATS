import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type { paths } from './api-types';

export type CandidateStage = 'applied' | 'screening' | 'interview' | 'technical' | 'offer' | 'hired' | 'rejected';
export type CandidateSource = 'referral' | 'linkedin' | 'job_board' | 'career_site' | 'agency' | 'other';

export type BaseCandidateRead = paths['/api/v1/candidates/{candidate_id}']['get']['responses']['200']['content']['application/json'];
export type CandidateRead = BaseCandidateRead & {
  resume_text?: string | null;
  match_score?: number | null;
  match_details?: string | null;
};

export type BaseCandidateCreate = paths['/api/v1/candidates']['post']['requestBody']['content']['application/json'];
export type CandidateCreate = BaseCandidateCreate & {
  resume_text?: string | null;
  match_score?: number | null;
  match_details?: string | null;
};

export type BaseCandidateUpdate = paths['/api/v1/candidates/{candidate_id}']['patch']['requestBody']['content']['application/json'];
export type CandidateUpdate = BaseCandidateUpdate & {
  resume_text?: string | null;
  match_score?: number | null;
  match_details?: string | null;
};

export type CandidateFacets = paths['/api/v1/candidates/facets']['get']['responses']['200']['content']['application/json'];
export type StageEventRead = paths['/api/v1/candidates/{candidate_id}/events']['get']['responses']['200']['content']['application/json'][number];
export type NoteRead = paths['/api/v1/candidates/{candidate_id}/notes']['get']['responses']['200']['content']['application/json'][number];
export type DashboardSummary = paths['/api/v1/dashboard/summary']['get']['responses']['200']['content']['application/json'];
export type DashboardFunnelStage = paths['/api/v1/dashboard/funnel']['get']['responses']['200']['content']['application/json'][number];
export type DashboardTimeSeriesPoint = paths['/api/v1/dashboard/applications-timeseries']['get']['responses']['200']['content']['application/json'][number];
export type DashboardSourceBreakdown = paths['/api/v1/dashboard/sources']['get']['responses']['200']['content']['application/json'][number];
export type DashboardStageDuration = paths['/api/v1/dashboard/stage-durations']['get']['responses']['200']['content']['application/json'][number];
export type DashboardRecentActivity = paths['/api/v1/dashboard/recent-activity']['get']['responses']['200']['content']['application/json'][number];
export type UserRead = paths['/api/v1/auth/me']['get']['responses']['200']['content']['application/json'];

// --- Screening & Matching Types ---
export interface PresetJobDescription {
  role: string;
  title: string;
  description: string;
  default_threshold: number;
}

export interface ScreeningResult {
  score: number;
  threshold: number;
  decision: 'ACCEPT' | 'REJECT';
  is_accepted: boolean;
  recommendation: string;
  summary_reason: string;
  matched_keywords: string[];
  missing_keywords: {
    critical: string[];
    important: string[];
    optional: string[];
  };
  categorized_skills: Record<string, string[]>;
  candidate_id?: string;
  candidate_name?: string;
  current_stage?: CandidateStage;
  auto_applied_stage?: CandidateStage | null;
  breakdown?: {
    keywords: number;
    skills: number;
    experience: number;
    achievements: number;
    formatting: number;
  };
  critical_matched?: string[];
  critical_missing?: string[];
  important_matched?: string[];
  important_missing?: string[];
  achievements_detected?: Array<{ clause: string; verb: string; metric_type: string }>;
  suggestions?: Array<{ level: 'CRITICAL' | 'RECOMMENDED' | 'TIP'; text: string }>;
}

export interface BatchScreenResponse {
  total_screened: number;
  accepted_count: number;
  rejected_count: number;
  threshold: number;
  auto_applied: boolean;
  results: (ScreeningResult & { error?: string })[];
}

export interface TextExtractionResponse {
  filename: string;
  text: string;
  extracted_keywords: string[];
  categorized_skills: Record<string, string[]>;
}

// --- Auth Hooks ---
export function useCurrentUser() {
  return useQuery<UserRead>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<UserRead>('/api/v1/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiFetch<{ user: UserRead; message: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

// --- Candidate Hooks ---
export interface CandidateListParams {
  q?: string;
  stage?: CandidateStage[];
  source?: CandidateSource[];
  role?: string;
  skills?: string[];
  created_from?: string;
  created_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export function useCandidates(params: CandidateListParams) {
  const queryParams = new URLSearchParams();
  if (params.q) queryParams.set('q', params.q);
  if (params.role) queryParams.set('role', params.role);
  if (params.sort) queryParams.set('sort', params.sort);
  if (params.order) queryParams.set('order', params.order);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.page_size) queryParams.set('page_size', params.page_size.toString());
  if (params.created_from) queryParams.set('created_from', params.created_from);
  if (params.created_to) queryParams.set('created_to', params.created_to);

  if (params.stage) {
    params.stage.forEach((s) => queryParams.append('stage', s));
  }
  if (params.source) {
    params.source.forEach((s) => queryParams.append('source', s));
  }
  if (params.skills) {
    params.skills.forEach((sk) => queryParams.append('skills', sk));
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/v1/candidates${queryString ? `?${queryString}` : ''}`;

  return useQuery<{ items: CandidateRead[]; total: number; page: number; page_size: number }>({
    queryKey: ['candidates', 'list', params],
    queryFn: () => apiFetch(endpoint),
    staleTime: 30 * 1000,
  });
}

export function useCandidate(id?: string) {
  return useQuery<CandidateRead>({
    queryKey: ['candidates', 'detail', id],
    queryFn: () => apiFetch<CandidateRead>(`/api/v1/candidates/${id}`),
    enabled: !!id,
  });
}

export function useCandidateFacets() {
  return useQuery<CandidateFacets>({
    queryKey: ['candidates', 'facets'],
    queryFn: () => apiFetch<CandidateFacets>('/api/v1/candidates/facets'),
    staleTime: 60 * 1000,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CandidateCreate) =>
      apiFetch<CandidateRead>('/api/v1/candidates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateCandidate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CandidateUpdate) =>
      apiFetch<CandidateRead>(`/api/v1/candidates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['candidates', 'detail', id], updated);
      queryClient.invalidateQueries({ queryKey: ['candidates', 'list'] });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/v1/candidates/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useChangeStage(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { to_stage: CandidateStage; reason?: string }) =>
      apiFetch<CandidateRead>(`/api/v1/candidates/${candidateId}/stage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['candidates', 'detail', candidateId], updated);
      queryClient.invalidateQueries({ queryKey: ['candidates', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', 'events', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBulkChangeStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidate_ids: string[]; to_stage: CandidateStage; reason?: string }) =>
      apiFetch<{ updated_count: number; to_stage: CandidateStage; message: string }>('/api/v1/candidates/bulk/stage', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCandidateEvents(candidateId?: string) {
  return useQuery<StageEventRead[]>({
    queryKey: ['candidates', 'events', candidateId],
    queryFn: () => apiFetch<StageEventRead[]>(`/api/v1/candidates/${candidateId}/events`),
    enabled: !!candidateId,
  });
}

// --- Notes Hooks ---
export function useCandidateNotes(candidateId?: string) {
  return useQuery<NoteRead[]>({
    queryKey: ['candidates', 'notes', candidateId],
    queryFn: () => apiFetch<NoteRead[]>(`/api/v1/candidates/${candidateId}/notes`),
    enabled: !!candidateId,
  });
}

export function useCreateNote(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string }) =>
      apiFetch<NoteRead>(`/api/v1/candidates/${candidateId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'notes', candidateId] });
    },
  });
}

export function useUpdateNote(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: string }) =>
      apiFetch<NoteRead>(`/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'notes', candidateId] });
    },
  });
}

export function useDeleteNote(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiFetch<void>(`/api/v1/notes/${noteId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'notes', candidateId] });
    },
  });
}

// --- Dashboard Hooks ---
export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary'),
    staleTime: 15 * 1000,
  });
}

export function useDashboardFunnel() {
  return useQuery<DashboardFunnelStage[]>({
    queryKey: ['dashboard', 'funnel'],
    queryFn: () => apiFetch<DashboardFunnelStage[]>('/api/v1/dashboard/funnel'),
    staleTime: 15 * 1000,
  });
}

export function useDashboardTimeseries(weeks = 12) {
  return useQuery<DashboardTimeSeriesPoint[]>({
    queryKey: ['dashboard', 'timeseries', weeks],
    queryFn: () => apiFetch<DashboardTimeSeriesPoint[]>(`/api/v1/dashboard/applications-timeseries?weeks=${weeks}`),
    staleTime: 60 * 1000,
  });
}

export function useDashboardSources() {
  return useQuery<DashboardSourceBreakdown[]>({
    queryKey: ['dashboard', 'sources'],
    queryFn: () => apiFetch<DashboardSourceBreakdown[]>('/api/v1/dashboard/sources'),
    staleTime: 60 * 1000,
  });
}

export function useDashboardStageDurations() {
  return useQuery<DashboardStageDuration[]>({
    queryKey: ['dashboard', 'stage-durations'],
    queryFn: () => apiFetch<DashboardStageDuration[]>('/api/v1/dashboard/stage-durations'),
    staleTime: 60 * 1000,
  });
}

export function useDashboardRecentActivity(limit = 10) {
  return useQuery<DashboardRecentActivity[]>({
    queryKey: ['dashboard', 'recent-activity', limit],
    queryFn: () => apiFetch<DashboardRecentActivity[]>(`/api/v1/dashboard/recent-activity?limit=${limit}`),
    staleTime: 15 * 1000,
  });
}

// --- Keyword Screening & Decision Hooks ---
export function useScreeningPresets() {
  return useQuery<PresetJobDescription[]>({
    queryKey: ['screening', 'presets'],
    queryFn: () => apiFetch<PresetJobDescription[]>('/api/v1/screening/presets'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useExtractResumeFile() {
  return useMutation<TextExtractionResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch<TextExtractionResponse>('/api/v1/screening/extract', {
        method: 'POST',
        body: formData,
      });
    },
  });
}

export function useEvaluateScreening() {
  return useMutation<
    ScreeningResult,
    Error,
    { resume_text: string; job_description: string; threshold?: number; required_keywords?: string[] }
  >({
    mutationFn: (body) =>
      apiFetch<ScreeningResult>('/api/v1/screening/evaluate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useScreenCandidate() {
  const queryClient = useQueryClient();
  return useMutation<
    ScreeningResult,
    Error,
    { candidateId: string; job_description: string; threshold?: number; auto_apply?: boolean; custom_resume_text?: string }
  >({
    mutationFn: ({ candidateId, ...body }) =>
      apiFetch<ScreeningResult>(`/api/v1/screening/candidate/${candidateId}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidates', 'events', vars.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useBatchScreenCandidates() {
  const queryClient = useQueryClient();
  return useMutation<
    BatchScreenResponse,
    Error,
    { candidate_ids: string[]; job_description: string; threshold?: number; auto_apply?: boolean }
  >({
    mutationFn: (body) =>
      apiFetch<BatchScreenResponse>('/api/v1/screening/batch', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- Student & Career Portal Types & Hooks ---
export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  experience_level: string;
  description: string;
  required_skills: string[];
  threshold: number;
}

export interface StudentTimelineEvent {
  from_stage: string | null;
  to_stage: string;
  created_at: string;
  reason: string | null;
}

export interface StudentApplicationStatus {
  candidate_id: string;
  full_name: string;
  email: string;
  applied_role: string;
  current_stage: CandidateStage;
  stage_entered_at: string;
  created_at: string;
  match_score: number | null;
  skills: string[];
  timeline: StudentTimelineEvent[];
}

export interface StudentApplicationPayload {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  applied_role: string;
  linkedin_url?: string;
  resume_text: string;
  skills?: string[];
}

export function useCareersJobs() {
  return useQuery<JobOpening[]>({
    queryKey: ['careers', 'jobs'],
    queryFn: () => apiFetch<JobOpening[]>('/api/v1/careers/jobs'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCheckApplicationStatus(email: string, enabled = false) {
  return useQuery<StudentApplicationStatus>({
    queryKey: ['careers', 'status', email],
    queryFn: () => apiFetch<StudentApplicationStatus>(`/api/v1/careers/status?email=${encodeURIComponent(email)}`),
    enabled: enabled && !!email.trim(),
    retry: false,
  });
}

export function useApplyJob() {
  const queryClient = useQueryClient();
  return useMutation<
    { status: string; message: string; candidate_id: string; current_stage: string; match_score: number },
    Error,
    StudentApplicationPayload
  >({
    mutationFn: (body) =>
      apiFetch('/api/v1/careers/apply', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location: string;
  employment_type?: string;
  experience_level?: string;
  description: string;
  required_skills?: string[];
  threshold?: number;
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation<JobOpening, Error, CreateJobPayload>({
    mutationFn: (body) =>
      apiFetch<JobOpening>('/api/v1/careers/jobs', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careers', 'jobs'] });
    },
  });
}

// --- Interview & Offer Management Types and Hooks ---

export interface ScheduledInterview {
  id: string;
  round_type: string;
  title: string;
  interviewer_name: string;
  interviewer_email: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  rating?: number | null;
  scorecard_notes?: string | null;
  created_at: string;
}

export interface CandidateOffer {
  base_salary: number;
  bonus_percentage: number;
  equity_shares: number;
  currency: string;
  start_date: string;
  expiration_date: string;
  notes?: string | null;
  letter_markdown: string;
  created_at: string;
  status: string;
}

export interface ScheduleInterviewPayload {
  round_type: string;
  title: string;
  interviewer_name: string;
  interviewer_email: string;
  scheduled_at: string;
  duration_minutes?: number;
  meeting_link?: string;
}

export interface UpdateInterviewPayload {
  status: 'scheduled' | 'completed' | 'cancelled';
  rating?: number | null;
  scorecard_notes?: string | null;
}

export interface OfferPackagePayload {
  base_salary: number;
  bonus_percentage: number;
  equity_shares: number;
  currency: string;
  start_date: string;
  expiration_date: string;
  notes?: string | null;
}

export function useCandidateInterviews(candidateId?: string) {
  return useQuery<ScheduledInterview[]>({
    queryKey: ['candidates', candidateId, 'interviews'],
    queryFn: () => apiFetch<ScheduledInterview[]>(`/api/v1/candidates/${candidateId}/interviews`),
    enabled: !!candidateId,
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation<ScheduledInterview, Error, { candidateId: string; payload: ScheduleInterviewPayload }>({
    mutationFn: ({ candidateId, payload }) =>
      apiFetch<ScheduledInterview>(`/api/v1/candidates/${candidateId}/interviews`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation<ScheduledInterview, Error, { candidateId: string; interviewId: string; payload: UpdateInterviewPayload }>({
    mutationFn: ({ candidateId, interviewId, payload }) =>
      apiFetch<ScheduledInterview>(`/api/v1/candidates/${candidateId}/interviews/${interviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useCandidateOffer(candidateId?: string) {
  return useQuery<CandidateOffer | null>({
    queryKey: ['candidates', candidateId, 'offer'],
    queryFn: () => apiFetch<CandidateOffer | null>(`/api/v1/candidates/${candidateId}/offer`),
    enabled: !!candidateId,
  });
}

export function useCreateCandidateOffer() {
  const queryClient = useQueryClient();
  return useMutation<CandidateOffer, Error, { candidateId: string; payload: OfferPackagePayload }>({
    mutationFn: ({ candidateId, payload }) =>
      apiFetch<CandidateOffer>(`/api/v1/candidates/${candidateId}/offer`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'offer'] });
      queryClient.invalidateQueries({ queryKey: ['candidates', vars.candidateId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

// Convenience Aliases for Jobs & Careers Hub
export type JobRequisition = JobOpening;
export const useJobs = useCareersJobs;
export const useApplyCandidate = useApplyJob;
export const useCandidateStatus = (email: string) => useCheckApplicationStatus(email, !!email.trim());

export interface ResumeScanResponse extends ScreeningResult {
  breakdown?: {
    keywords: number;
    skills: number;
    experience: number;
    achievements: number;
    formatting: number;
    keyword_overlap?: number;
    skills_coverage?: number;
    experience_fit?: number;
    quantified_achievements?: number;
    formatting_structure?: number;
  };
}

export function useScanResume() {
  const evaluateMutation = useEvaluateScreening();
  return {
    ...evaluateMutation,
    mutateAsync: async ({ resume_text, target_role }: { resume_text: string; target_role?: string }) => {
      return evaluateMutation.mutateAsync({
        resume_text,
        job_description: target_role || 'Software Engineer',
      });
    },
  };
}



