import { Link } from 'react-router-dom'
import type { BookingSummary } from '../../api/bookingTypes'
import { BOOKING_STATUS } from '../../lib/bookingStatus'
import { dateBadge } from '../../lib/eventDate'
import { formatLocalDateTime, formatMoney } from '../../lib/format'
import { Badge } from '../ui/Badge'

// A booking summary does not carry the venue's time zone, so the stamp shows the day in the visitor's own zone.
const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export function BookingSummaryCard({ booking }: { booking: BookingSummary }) {
  const status = BOOKING_STATUS[booking.status]
  const stamp = dateBadge(booking.eventStartsAt, LOCAL_ZONE)

  return (
    <li className="flex overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5">
      <div aria-hidden="true" className="flex w-20 shrink-0 flex-col items-center justify-center bg-midnight py-4 text-center text-white">
        <span className="text-xs font-semibold text-rose">{stamp.month}</span>
        <span className="font-display text-3xl font-extrabold leading-none">{stamp.day}</span>
        <span className="mt-1 text-xs text-white/70">{stamp.weekday}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            <Link to={`/bookings/${booking.id}`} className="hover:text-indigo-700 hover:underline">
              {booking.eventTitle}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-slate-600">{formatLocalDateTime(booking.eventStartsAt)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Booking <span className="font-mono">{booking.reference}</span>
          </p>
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
        </div>
        <div className="text-right">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {booking.totalAmount === 0 ? 'Free' : formatMoney(booking.totalAmount, booking.currency)}
          </p>
        </div>
      </div>
    </li>
  )
}