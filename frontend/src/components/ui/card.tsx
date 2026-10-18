import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'ghost' | 'interactive';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Heading: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  Description: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
} = ({ variant = 'default', className, children, ...props }) => {
  const variantStyles = {
    default: 'bg-slate-900/60 border border-white/[0.08]',
    elevated: 'bg-slate-900/90 border border-white/[0.1] shadow-xl shadow-black/40',
    ghost: 'bg-transparent border border-white/[0.06]',
    interactive:
      'bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-150 cursor-pointer',
  }[variant];

  return (
    <div
      className={clsx('rounded-2xl overflow-hidden font-sans', variantStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={clsx('px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Heading = function CardHeading({ className, children, ...props }) {
  return (
    <h3
      className={clsx('text-sm font-semibold text-white tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
};

Card.Description = function CardDescription({ className, children, ...props }) {
  return (
    <p className={clsx('text-xs text-slate-400 mt-0.5', className)} {...props}>
      {children}
    </p>
  );
};

Card.Body = function CardBody({ className, children, ...props }) {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={clsx('px-5 py-3 border-t border-white/[0.06] bg-slate-950/40 flex items-center justify-between gap-3 text-xs', className)}
      {...props}
    >
      {children}
    </div>
  );
};
