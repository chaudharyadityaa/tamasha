import { Link } from 'react-router-dom'
import type { EventSummary } from '../../api/types'
import { dateBadge } from '../../lib/eventDate'
import { formatMoney } from '../../lib/format'
import { PosterArt } from '../art/PosterArt'

function priceLabel(event: EventSummary): string {
  if (event.startingPrice === null) {
    return 'Price on request'
  }
  if (event.startingPrice === 0) {
    return 'Free'
  }
  return `From ${formatMoney(event.startingPrice, event.currency)}`
}

interface EventCardProps {
  event: EventSummary
  /** Extra classes for the list item, for example a fixed width inside a scrolling rail. */
  className?: string
}

export function EventCard({ event, className = '' }: EventCardProps) {
  const badge = dateBadge(event.startsAt, event.timeZone)

  return (
    <li className={`group ${className}`}>
      <Link
        to={`/events/${event.id}`}
        className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50"
      >
        <article className="overflow-hidden rounded-md bg-white shadow-[0_14px_30px_-14px_rgba(27,23,48,0.45)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_22px_36px_-14px_rgba(27,23,48,0.55)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-slate-200">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <PosterArt
                category={event.category}
                seed={`${event.id}-${event.title}`}
                className="h-full w-full transition duration-500 group-hover:scale-105"
              />
            )}
            <span className="absolute left-3 top-3 rounded-sm bg-white/95 px-2.5 py-1 text-xs font-semibold text-midnight">
              {event.category}
            </span>
            <div className="absolute right-3 top-3 w-12 overflow-hidden rounded-sm bg-white text-center text-midnight shadow">
              <span className="block bg-rose px-1 py-0.5 text-[0.7rem] font-semibold leading-none text-white">{badge.month}</span>
              <span className="block py-1 font-display text-xl font-extrabold leading-none">{badge.day}</span>
            </div>
          </div>

          <div className="relative border-t border-dashed border-slate-300 px-4 pb-4 pt-5">
            <span aria-hidden="true" className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-slate-50" />
            <span aria-hidden="true" className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-slate-50" />
            <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-slate-900">{event.title}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {badge.weekday}, {badge.time}
            </p>
            <p className="text-sm text-slate-600">
              {event.venueName}, {event.city}
            </p>
            <p className="mt-3 text-sm font-semibold text-indigo-700">{priceLabel(event)}</p>
          </div>
        </article>
      </Link>
    </li>
  )
}