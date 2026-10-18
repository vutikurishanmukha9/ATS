import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message = 'Failed to load data from server.',
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between p-3.5 bg-semantic-danger-bg text-semantic-danger border border-semantic-danger/30 rounded-sm text-body ${className || ''}`}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 stroke-[1.5]" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="h-3.5 w-3.5 stroke-[1.5]" />}
          className="border-semantic-danger/40 text-semantic-danger hover:bg-semantic-danger/10"
        >
          Retry
        </Button>
      )}
    </div>
  );
};
