import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, User } from 'lucide-react'
import { TicketTypeList } from '../components/events/TicketTypeList'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useEventDetail } from '../hooks/useEventDetail'
import { formatDateRange } from '../lib/format'

function cancellationNote(hours: number): string {
  if (hours <= 0) {
    return 'Paid bookings can be cancelled until the event starts.'
  }
  return `Paid bookings can be cancelled up to ${hours} hour${hours === 1 ? '' : 's'} before the event starts.`
}

export function EventDetailPage() {
  const { id = '' } = useParams()
  const validId = /^\d+$/.test(id)
  const [reloads, setReloads] = useState(0)
  const { event, loading, error, notFound } = useEventDetail(validId ? id : null, reloads)

  if (!validId || notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
        <p className="mt-2 text-slate-600">This event does not exist, or it is no longer available.</p>
        <Link to="/events" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Browse all events
        </Link>
      </div>
    )
  }
  if (loading) {
    return <Spinner label="Loading event…" />
  }
  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
          Try again
        </Button>
      </div>
    )
  }
  if (!event) {
    return null
  }

  const venue = event.venue
  const address = [venue.addressLine, venue.city, venue.region, venue.country].filter(Boolean).join(', ')
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${address}`)}`

  return (
    <article>
      <Link to="/events" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All events
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-400 sm:h-56">
            <CalendarDays className="h-12 w-12" aria-hidden="true" />
          </div>
        )}

        <div className="grid gap-8 p-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{event.category}</Badge>
              <Badge>{event.seatingMode === 'RESERVED_SEATING' ? 'Reserved seating' : 'General admission'}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{event.title}</h1>

            <dl className="mt-6 space-y-4 text-sm">
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
                  <p className="text-slate-600">{address}</p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-indigo-700 hover:underline"
                  >
                    Open in Maps
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="mt-0.5 text-slate-400">
                  <User className="h-5 w-5" aria-label="Organizer" />
                </dt>
                <dd className="text-slate-700">Organized by {event.organizerName}</dd>
              </div>
            </dl>

            {event.description && (
              <section className="mt-8" aria-labelledby="about-heading">
                <h2 id="about-heading" className="text-lg font-semibold text-slate-900">
                  About this event
                </h2>
                {/* Plain text only: React escapes it, so organizer-written text can never run as HTML. */}
                <p className="mt-2 whitespace-pre-line text-slate-700">{event.description}</p>
              </section>
            )}
          </div>

          <aside aria-labelledby="tickets-heading" className="lg:col-span-1">
            <h2 id="tickets-heading" className="text-lg font-semibold text-slate-900">
              Tickets
            </h2>
            <div className="mt-3">
              <TicketTypeList ticketTypes={event.ticketTypes} currency={event.currency} timeZone={venue.timeZone} />
            </div>
            <Button className="mt-4 w-full" disabled>
              Book tickets
            </Button>
            <p className="mt-2 text-xs text-slate-500">Booking opens in the next update.</p>
            <p className="mt-3 text-xs text-slate-500">{cancellationNote(event.cancellationCutoffHours)}</p>
          </aside>
        </div>
      </div>
    </article>
  )
}