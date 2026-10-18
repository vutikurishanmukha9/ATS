import React, { useRef, useId } from 'react';
import clsx from 'clsx';

export interface SegmentedControlOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/**
 * Enterprise Segmented Control component
 * Modeled after enterprise design system compound controls.
 * Features ARIA radiogroup/radio semantics, keyboard arrow navigation,
 * and high-contrast obsidian-emerald active states.
 */
export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  size = 'sm',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupId = useId();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabledOptions = options.filter((opt) => !opt.disabled);
    const currentIndex = enabledOptions.findIndex((opt) => opt.id === value);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledOptions.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextOption = enabledOptions[nextIndex];
      onChange(nextOption.id);
      // Focus corresponding element
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      if (buttons) {
        const targetBtn = Array.from(buttons).find((b) => b.getAttribute('data-value') === nextOption.id);
        targetBtn?.focus();
      }
    }
  };

  const sizeClasses = {
    sm: 'h-8 p-0.5 text-xs gap-0.5 rounded-xl',
    md: 'h-9 p-1 text-xs gap-1 rounded-xl',
  }[size];

  const itemSizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    md: 'px-3 py-1.5 text-xs gap-2 rounded-lg',
  }[size];

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      id={groupId}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={clsx(
        'inline-flex items-center bg-slate-950/80 border border-white/[0.08] shadow-inner select-none p-0.5 font-sans',
        sizeClasses,
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={option.disabled}
            data-value={option.id}
            onClick={() => {
              if (!option.disabled && option.id !== value) {
                onChange(option.id);
              }
            }}
            className={clsx(
              'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
              itemSizeClasses,
              isSelected
                ? 'bg-slate-800 text-white shadow-xs border border-white/[0.1] font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            )}
          >
            {option.icon && (
              <span
                className={clsx(
                  'shrink-0 flex items-center justify-center',
                  isSelected ? 'text-emerald-400' : 'text-slate-400'
                )}
                aria-hidden="true"
              >
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={clsx(
                  'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight',
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
