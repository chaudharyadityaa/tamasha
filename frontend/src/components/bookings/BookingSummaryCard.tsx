import { Link } from 'react-router-dom'
import type { BookingSummary } from '../../api/bookingTypes'
import { BOOKING_STATUS } from '../../lib/bookingStatus'
import { formatLocalDateTime, formatMoney } from '../../lib/format'
import { Badge } from '../ui/Badge'

export function BookingSummaryCard({ booking }: { booking: BookingSummary }) {
  const status = BOOKING_STATUS[booking.status]

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            <Link to={`/bookings/${booking.id}`} className="hover:text-indigo-700 hover:underline">
              {booking.eventTitle}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-slate-600">{formatLocalDateTime(booking.eventStartsAt)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Booking <span className="font-mono">{booking.reference}</span>
          </p>
        </div>
        <div className="text-right">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {booking.totalAmount === 0 ? 'Free' : formatMoney(booking.totalAmount, booking.currency)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium">
        <Link to={`/bookings/${booking.id}`} className="text-indigo-700 hover:underline">
          {booking.status === 'PENDING_PAYMENT' ? 'Complete payment' : 'View booking'}
        </Link>
        {booking.status === 'CONFIRMED' && (
          <Link to={`/bookings/${booking.id}/tickets`} className="text-indigo-700 hover:underline">
            View tickets
          </Link>
        )}
      </div>
    </li>
  )
}