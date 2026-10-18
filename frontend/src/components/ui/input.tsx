import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, type = 'text', ...props }, ref) => {
    const inputElement = (
      <input
        ref={ref}
        type={type}
        className={clsx(
          'w-full bg-[#0E1420] text-slate-100 text-xs sm:text-sm px-3.5 h-10 rounded-xl border transition-all duration-150',
          'placeholder:text-slate-500 font-sans shadow-inner',
          icon && 'pl-9.5',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500',
          'disabled:opacity-40 disabled:bg-slate-950 disabled:cursor-not-allowed',
          error
            ? 'border-rose-500/80 text-rose-200 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-white/[0.08] hover:border-white/[0.16]',
          className
        )}
        {...props}
      />
    );

    if (icon) {
      return (
        <div className="relative w-full flex items-center">
          <div className="absolute left-3 pointer-events-none text-slate-400 flex items-center justify-center">
            {icon}
          </div>
          {inputElement}
        </div>
      );
    }

    return inputElement;
  }
);

Input.displayName = 'Input';
