import React from 'react';
import clsx from 'clsx';

export type StatusType = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
export type StatusEmphasis = 'high' | 'low';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: StatusType;
  emphasis?: StatusEmphasis;
  label?: string;
  children?: React.ReactNode;
  pulse?: boolean;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Enterprise Status Indicator component
 * Follows enterprise design system patterns for semantic status communication
 * with high/low emphasis, accessible contrast, and dot indicator.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type = 'neutral',
  emphasis = 'low',
  label,
  children,
  pulse = false,
  showDot = true,
  size = 'sm',
  className,
  ...props
}) => {
  const content = children || label;

  const typeConfig: Record<
    StatusType,
    {
      low: { bg: string; text: string; border: string; dot: string };
      high: { bg: string; text: string; border: string; dot: string };
    }
  > = {
    neutral: {
      low: {
        bg: 'bg-slate-800/70',
        text: 'text-slate-300',
        border: 'border-slate-700/60',
        dot: 'bg-slate-400',
      },
      high: {
        bg: 'bg-slate-700',
        text: 'text-white',
        border: 'border-slate-600',
        dot: 'bg-white',
      },
    },
    success: {
      low: {
        bg: 'bg-emerald-950/50',
        text: 'text-emerald-300',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      },
      high: {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-500',
        dot: 'bg-white',
      },
    },
    accent: {
      low: {
        bg: 'bg-emerald-950/60',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
      },
      high: {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-500',
        dot: 'bg-white',
      },
    },
    warning: {
      low: {
        bg: 'bg-amber-950/50',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
      },
      high: {
        bg: 'bg-amber-600',
        text: 'text-slate-950 font-bold',
        border: 'border-amber-500',
        dot: 'bg-slate-950',
      },
    },
    danger: {
      low: {
        bg: 'bg-rose-950/50',
        text: 'text-rose-300',
        border: 'border-rose-500/30',
        dot: 'bg-rose-400',
      },
      high: {
        bg: 'bg-rose-600',
        text: 'text-white',
        border: 'border-rose-500',
        dot: 'bg-white',
      },
    },
  };

  const current = typeConfig[type][emphasis];
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border select-none tracking-tight font-sans',
        current.bg,
        current.text,
        current.border,
        sizeStyles,
        className
      )}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          {pulse && (
            <span
              className={clsx(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                current.dot
              )}
            />
          )}
          <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', current.dot)} />
        </span>
      )}
      <span>{content}</span>
    </span>
  );
};
