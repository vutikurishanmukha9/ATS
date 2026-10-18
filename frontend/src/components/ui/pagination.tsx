import React from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

/**
 * Enterprise Pagination component
 * Modeled after enterprise data table pagination patterns:
 * - Details summary ("Showing X-Y of Z items")
 * - Page size select dropdown
 * - Discrete numbered pages with ellipsis
 * - Prev/Next navigation with disabled state handling
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = 'candidates',
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, page * pageSize);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (page >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <nav
      aria-label="Pagination Navigation"
      className={clsx(
        'border-t border-white/[0.08] px-4 py-3 bg-slate-950/70',
        'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans',
        className
      )}
    >
      {/* Range summary details */}
      <div className="text-slate-400 select-none">
        Showing{' '}
        <span className="font-semibold text-white font-mono tnum">
          {startItem}–{endItem}
        </span>{' '}
        of <span className="font-semibold text-white font-mono tnum">{totalCount}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-3.5">
        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Rows:</span>
            <select
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-7.5 px-2 text-xs bg-slate-900 border border-white/[0.1] rounded-lg text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stepper buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Previous Page"
            className="h-7 px-2"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 select-none"
                    aria-hidden="true"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </span>
                );
              }

              const isCurrent = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => onPageChange(p)}
                  className={clsx(
                    'w-7 h-7 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer select-none',
                    isCurrent
                      ? 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-500'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            aria-label="Next Page"
            className="h-7 px-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
};
