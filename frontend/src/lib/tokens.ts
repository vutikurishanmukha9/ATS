import type { CandidateStage, CandidateSource } from './api';

export interface StageMeta {
  key: CandidateStage;
  label: string;
  keyboardKey: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const STAGES: StageMeta[] = [
  {
    key: 'applied',
    label: 'Applied',
    keyboardKey: '1',
    bgClass: 'bg-stage-applied-bg',
    textClass: 'text-stage-applied-text',
    borderClass: 'border-stage-applied-text/20',
  },
  {
    key: 'screening',
    label: 'Screening',
    keyboardKey: '2',
    bgClass: 'bg-stage-screening-bg',
    textClass: 'text-stage-screening-text',
    borderClass: 'border-stage-screening-text/20',
  },
  {
    key: 'interview',
    label: 'Interview',
    keyboardKey: '3',
    bgClass: 'bg-stage-interview-bg',
    textClass: 'text-stage-interview-text',
    borderClass: 'border-stage-interview-text/20',
  },
  {
    key: 'technical',
    label: 'Technical',
    keyboardKey: '4',
    bgClass: 'bg-stage-technical-bg',
    textClass: 'text-stage-technical-text',
    borderClass: 'border-stage-technical-text/20',
  },
  {
    key: 'offer',
    label: 'Offer',
    keyboardKey: '5',
    bgClass: 'bg-stage-offer-bg',
    textClass: 'text-stage-offer-text',
    borderClass: 'border-stage-offer-text/20',
  },
  {
    key: 'hired',
    label: 'Hired',
    keyboardKey: '6',
    bgClass: 'bg-stage-hired-bg',
    textClass: 'text-stage-hired-text',
    borderClass: 'border-stage-hired-text/20',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    keyboardKey: '7',
    bgClass: 'bg-stage-rejected-bg',
    textClass: 'text-stage-rejected-text',
    borderClass: 'border-stage-rejected-text/20',
  },
];

export const SOURCE_LABELS: Record<CandidateSource, string> = {
  referral: 'Referral',
  linkedin: 'LinkedIn',
  job_board: 'Job Board',
  career_site: 'Career Site',
  agency: 'Agency',
  other: 'Other',
};

export function getStageMeta(stage: string): StageMeta {
  const match = STAGES.find((s) => s.key === stage);
  if (match) return match;
  return STAGES[0];
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function formatAbsoluteTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC';
}
