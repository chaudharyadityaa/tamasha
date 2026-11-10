import { Link } from 'react-router-dom'
import type { OrganizerEvent } from '../../api/organizerTypes'
import { EVENT_STATUS, SEATING_LABEL } from '../../lib/eventStatus'
import { formatDateTime } from '../../lib/format'
import { Badge } from '../ui/Badge'

export function OrganizerEventRow({ event }: { event: OrganizerEvent }) {
  const status = EVENT_STATUS[event.status]
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            <Link to={`/organizer/events/${event.id}`} className="hover:text-indigo-700 hover:underline">
              {event.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-slate-600">{formatDateTime(event.startsAt, event.venue.timeZone)}</p>
          <p className="text-sm text-slate-600">
            {event.venue.name}, {event.venue.city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-xs text-slate-500">{SEATING_LABEL[event.seatingMode]}</span>
        </div>
      </div>
    </li>
  )
}