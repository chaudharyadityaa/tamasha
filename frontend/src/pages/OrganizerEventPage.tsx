import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import { getOrganizerEvent, listTicketTypes } from '../api/organizer'
import type { OrganizerEvent } from '../api/organizerTypes'
import { EventLifecycleActions } from '../components/organizer/EventLifecycleActions'
import { OrganizerTicketTypes } from '../components/organizer/OrganizerTicketTypes'
import { SalesOverview } from '../components/organizer/SalesOverview'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { useApiResource } from '../hooks/useApiResource'
import { EVENT_STATUS, SEATING_LABEL } from '../lib/eventStatus'
import { formatDateRange } from '../lib/format'

const buttonLink =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryLink = `${buttonLink} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`

export function OrganizerEventPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <EventNotFound />
  }
  // Keyed by id so moving to another event never shows the previous event's data.
  return <EventView key={id} id={Number(id)} />
}

function EventNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
      <p className="mt-2 text-slate-600">This event does not exist, or it belongs to another organizer.</p>
      <Link to="/organizer" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Back to the dashboard
      </Link>
    </div>
  )
}

function EventView({ id }: { id: number }) {
  const loaded = useApiResource(getOrganizerEvent, id, 0)
  const [updated, setUpdated] = useState<OrganizerEvent | null>(null)
  const [ticketReloads, setTicketReloads] = useState(0)
  const ticketTypes = useApiResource(listTicketTypes, id, ticketReloads)

  // After publish, unpublish or cancel we show the event the server returned, without another request.
  const event = updated ?? loaded.data

  if (loaded.notFound) {
    return <EventNotFound />
  }
  if (loaded.loading) {
    return <Spinner label="Loading the event…" />
  }
  if (loaded.error || !event) {
    return <Alert variant="error">{loaded.error ?? 'The event could not be loaded.'}</Alert>
  }

  const status = EVENT_STATUS[event.status]
  const venue = event.venue

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/organizer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Organizer dashboard
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {event.status !== 'CANCELLED' && (
          <Link to={`/organizer/events/${event.id}/edit`} className={secondaryLink}>
            Edit event
          </Link>
        )}
        {event.status === 'PUBLISHED' && (
          <Link to={`/events/${event.id}`} className={`${buttonLink} bg-indigo-600 text-white hover:bg-indigo-700`}>
            View public page
          </Link>
        )}
        {event.status !== 'DRAFT' && (
          <Link to={`/organizer/events/${event.id}/bookings`} className={secondaryLink}>
            Bookings
          </Link>
        )}
        {event.status === 'PUBLISHED' && (
          <Link to={`/organizer/events/${event.id}/check-in`} className={secondaryLink}>
            Check-in
          </Link>
        )}
        {event.seatingMode === 'RESERVED_SEATING' && (
          <Link to={`/organizer/venues/${venue.id}/seats`} className={secondaryLink}>
            Manage venue seats
          </Link>
        )}
      </div>

      <EventLifecycleActions
        event={event}
        ticketTypeCount={ticketTypes.data ? ticketTypes.data.length : null}
        onChanged={setUpdated}
      />

      <dl className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <div className="flex gap-3">
          <dt className="mt-0.5 text-slate-400">
            <CalendarDays className="h-5 w-5" aria-label="When" />
          </dt>
          <dd>
            <p className="font-medium text-slate-900">{formatDateRange(event.startsAt, event.endsAt, venue.timeZone)}</p>
            <p className="text-slate-500">Times are in the venue's time zone ({venue.timeZone}).</p>
          </dd>
        </div>
        <div className="flex gap-3">
          <dt className="mt-0.5 text-slate-400">
            <MapPin className="h-5 w-5" aria-label="Where" />
          </dt>
          <dd>
            <p className="font-medium text-slate-900">{venue.name}</p>
            <p className="text-slate-600">{[venue.addressLine, venue.city, venue.region, venue.country].filter(Boolean).join(', ')}</p>
          </dd>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="font-medium text-slate-900">{event.category}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Seating</dt>
            <dd className="font-medium text-slate-900">{SEATING_LABEL[event.seatingMode]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Currency</dt>
            <dd className="font-medium text-slate-900">{event.currency}</dd>
          </div>
        </div>
        <div>
          <dt className="text-slate-500">Cancellation cutoff</dt>
          <dd className="font-medium text-slate-900">
            {event.cancellationCutoffHours} hour{event.cancellationCutoffHours === 1 ? '' : 's'} before the start
          </dd>
        </div>
        {event.description && (
          <div>
            <dt className="text-slate-500">Description</dt>
            {/* Plain text only: React escapes it. */}
            <dd className="mt-1 whitespace-pre-line text-slate-800">{event.description}</dd>
          </div>
        )}
      </dl>

      {event.status !== 'DRAFT' && <SalesOverview eventId={event.id} />}

      <OrganizerTicketTypes
        event={event}
        ticketTypes={ticketTypes.data}
        loadError={ticketTypes.error}
        onChanged={() => setTicketReloads((count) => count + 1)}
      />
    </article>
  )
}