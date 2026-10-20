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
 * Clean Status Indicator component
 * Calibrated semantic indicators with crisp contrast and quiet background fills.
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
        bg: 'bg-white/[0.04]',
        text: 'text-slate-300',
        border: 'border-white/[0.08]',
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
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
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
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
        dot: 'bg-blue-400',
      },
      high: {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-500',
        dot: 'bg-white',
      },
    },
    warning: {
      low: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
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
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
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
        'inline-flex items-center gap-1.5 font-medium rounded-md border select-none tracking-tight font-sans',
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
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-40',
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
