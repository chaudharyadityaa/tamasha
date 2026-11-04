import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageWindow } from '../../lib/pagination'

interface PaginationProps {
  /** Current page, starting at 1. */
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const baseButton =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        className={`${baseButton} text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>

      {pageWindow(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={`${baseButton} ${item === page ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={`${baseButton} text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  )
}