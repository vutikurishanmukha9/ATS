import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      children,
      icon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 font-sans';

    const variantStyles = {
      primary:
        'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm shadow-emerald-950/40 border border-emerald-500/80 font-semibold tracking-tight',
      secondary:
        'bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-2xs font-medium',
      outline:
        'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700/80 font-medium',
      ghost:
        'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent font-medium',
      danger:
        'bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white shadow-sm shadow-rose-950/40 border border-rose-500/70 font-semibold',
    }[variant];

    const sizeStyles = {
      xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
      md: 'h-9 px-3.5 text-xs gap-2 rounded-xl',
      lg: 'h-10 px-4 text-sm gap-2.5 rounded-xl',
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={clsx(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-current shrink-0 stroke-[2]" />
        ) : icon ? (
          <span className="shrink-0 flex items-center justify-center">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
