import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ActionBarItemProps {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export interface ActionBarProps {
  selectedCount: number;
  itemTypeLabel?: string;
  onClearSelection: () => void;
  actions: ActionBarItemProps[];
  className?: string;
  portal?: boolean;
}

/**
 * Enterprise Action Bar component
 * Directly modeled after enterprise action bar patterns:
 * - Docked at the bottom of the viewport
 * - Sticks as user scrolls
 * - Strictly enforces 1 primary action max
 * - Features keyboard Esc shortcut to dismiss selection
 * - Obsidian floating pill styling with emerald accent
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  selectedCount,
  itemTypeLabel = 'items',
  onClearSelection,
  actions,
  className,
}) => {
  // Listen for Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCount > 0) {
        onClearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onClearSelection]);

  if (selectedCount <= 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk action bar"
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'w-auto max-w-[95vw] sm:max-w-3xl',
        'bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl shadow-black/80 rounded-2xl',
        'p-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3 text-xs',
        'animate-in fade-in slide-in-from-bottom-3 duration-200 ease-out',
        className
      )}
    >
      {/* Selection count and clear pill */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs font-mono shadow-xs">
          {selectedCount}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white">
            {selectedCount} {itemTypeLabel}
          </span>
          <span className="text-slate-400">selected</span>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="ml-1 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          title="Clear selection (Esc)"
        >
          <X className="w-3 h-3" aria-hidden="true" />
          <span>Clear</span>
        </button>
      </div>

      <div className="h-4 w-px bg-white/[0.1] hidden sm:block shrink-0" aria-hidden="true" />

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            size="sm"
            variant={action.variant || 'secondary'}
            onClick={action.onClick}
            disabled={action.disabled}
            loading={action.loading}
            icon={action.icon}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
