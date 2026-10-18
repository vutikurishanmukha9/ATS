import React from 'react';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  'aria-label'?: string;
}

/**
 * Enterprise Breadcrumbs component
 * Modeled after enterprise hierarchical navigation patterns:
 * - Proper WAI-ARIA breadcrumb landmarks
 * - Interactive root & ancestor items
 * - Non-interactive active page terminal
 * - High-contrast obsidian-emerald typography
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className,
  'aria-label': ariaLabel = 'Breadcrumb',
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={clsx('flex items-center text-xs font-sans', className)}>
      <ol className="flex items-center flex-wrap gap-1.5 list-none m-0 p-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-600 shrink-0 select-none"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-slate-300 truncate max-w-[240px] sm:max-w-xs flex items-center gap-1.5"
                >
                  {item.icon && <span className="shrink-0 text-emerald-400">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 truncate max-w-[180px] cursor-pointer"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 truncate max-w-[180px]"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </a>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5 truncate max-w-[180px]">
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
