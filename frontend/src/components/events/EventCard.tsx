import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import type { EventSummary } from '../../api/types'
import { formatDateTime, formatMoney } from '../../lib/format'

function priceLabel(event: EventSummary): string {
  if (event.startingPrice === null) {
    return 'Price on request'
  }
  if (event.startingPrice === 0) {
    return 'Free'
  }
  return `From ${formatMoney(event.startingPrice, event.currency)}`
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/events/${event.id}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-400">
            <CalendarDays className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <div className="p-4">
          <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {event.category}
          </span>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-indigo-700">{event.title}</h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            {formatDateTime(event.startsAt, event.timeZone)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {event.venueName}, {event.city}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{priceLabel(event)}</p>
        </div>
      </Link>
    </li>
  )
}