import React from 'react';
import clsx from 'clsx';
import { getStageMeta } from '../../lib/tokens';

export interface StageBadgeProps {
  stage: string;
  className?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StageBadge: React.FC<StageBadgeProps> = ({
  stage,
  className,
  size = 'sm',
  showDot = true,
}) => {
  const meta = getStageMeta(stage);

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-sm border select-none tracking-tight',
        meta.bgClass,
        meta.textClass,
        meta.borderClass,
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px] leading-tight' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 opacity-80"
          style={{ backgroundColor: 'currentColor' }}
          aria-hidden="true"
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
};

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'neutral' }) => {
  const variantStyles = {
    neutral: 'bg-alt text-muted border-hairline',
    accent: 'bg-accent-subtle text-accent border-accent/20',
    success: 'bg-semantic-success-bg text-semantic-success border-semantic-success/20',
    warning: 'bg-semantic-warning-bg text-semantic-warning border-semantic-warning/20',
    danger: 'bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20',
  }[variant];

  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-sm border select-none',
        variantStyles,
        className
      )}
    >
      {children}
    </span>
  );
};
