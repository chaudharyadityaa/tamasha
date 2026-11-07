import { X } from 'lucide-react'
import type { SeatMapSection, SeatView } from '../../api/seatTypes'
import { formatMoney } from '../../lib/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

export interface SelectedSeat {
  seat: SeatView
  section: SeatMapSection
}

interface SelectedSeatsPanelProps {
  selected: SelectedSeat[]
  currency: string
  /** The browser's own sum: a preview only, the server prices the booking. */
  total: number
  authenticated: boolean
  loggingIn: boolean
  submitting: boolean
  error: string | null
  onRemove: (seatId: number) => void
  onReserve: () => void
}

export function SelectedSeatsPanel({
  selected,
  currency,
  total,
  authenticated,
  loggingIn,
  submitting,
  error,
  onRemove,
  onReserve,
}: SelectedSeatsPanelProps) {
  return (
    <section aria-labelledby="selection-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 id="selection-heading" className="text-lg font-semibold text-slate-900">
        Your seats
      </h2>

      <p className="mt-1 text-sm text-slate-600" aria-live="polite">
        {selected.length === 0 ? 'No seats selected yet.' : `${selected.length} seat${selected.length === 1 ? '' : 's'} selected`}
      </p>

      {selected.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {selected.map(({ seat, section }) => (
            <li key={seat.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                {section.section} · Row {seat.row} · Seat {seat.number}
                <span className="block text-xs text-slate-500">{formatMoney(section.price, currency)}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${section.section} row ${seat.row} seat ${seat.number}`}
                onClick={() => onRemove(seat.id)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <p className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
          <span>Total</span>
          <span>{total === 0 ? 'Free' : formatMoney(total, currency)}</span>
        </p>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <Button className="mt-4 w-full" loading={submitting} disabled={loggingIn} onClick={onReserve}>
        {authenticated || loggingIn ? 'Reserve seats' : 'Log in to book'}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        The final price is confirmed when you reserve. Seats are held for a short time while you pay.
      </p>
    </section>
  )
}