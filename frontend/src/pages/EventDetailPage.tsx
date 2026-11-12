import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from 'lucide-react'
import { PosterArt } from '../components/art/PosterArt'
import { BookingPanel } from '../components/events/BookingPanel'
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

/** The centered column used for the states that have no header band: loading, errors and "not found". */
function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
}

export function EventDetailPage() {
  const { id = '' } = useParams()
  const validId = /^\d+$/.test(id)
  const [reloads, setReloads] = useState(0)
  const { event, loading, error, notFound } = useEventDetail(validId ? id : null, reloads)

  if (!validId || notFound) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
          <p className="mt-2 text-slate-600">This event does not exist, or it is no longer available.</p>
          <Link to="/events" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
            Browse all events
          </Link>
        </div>
      </Shell>
    )
  }
  if (loading) {
    return (
      <Shell>
        <Spinner label="Loading event…" />
      </Shell>
    )
  }
  if (error) {
    return (
      <Shell>
        <div className="space-y-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
            Try again
          </Button>
        </div>
      </Shell>
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
      <div className="relative isolate overflow-hidden bg-midnight text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 -z-10 h-[24rem] w-[24rem] rounded-full border border-white/10" />

        <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
          <Link
            to="/events"
            className="inline-flex items-center gap-1 rounded-full text-sm font-medium text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All events
          </Link>

          <div className="mt-6 grid items-end gap-8 lg:grid-cols-[18rem_1fr]">
            <div className="mx-auto aspect-[4/5] w-56 overflow-hidden rounded-md shadow-2xl ring-1 ring-white/15 sm:w-64 lg:w-full">
              {event.imageUrl ? (
                <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <PosterArt category={event.category} seed={`${event.id}-${event.title}`} className="h-full w-full" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{event.category}</Badge>
                <Badge>{event.seatingMode === 'RESERVED_SEATING' ? 'Reserved seating' : 'General admission'}</Badge>
              </div>
              <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {event.title}
              </h1>
              <p className="mt-5 flex items-start gap-3 text-lg text-white/90">
                <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-marigold" aria-hidden="true" />
                <span>{formatDateRange(event.startsAt, event.endsAt, venue.timeZone)}</span>
              </p>
              <p className="mt-1 pl-8 text-sm text-white/60">Times are in the venue&rsquo;s time zone ({venue.timeZone}).</p>
              <p className="mt-3 flex items-start gap-3 text-lg text-white/90">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-marigold" aria-hidden="true" />
                <span>{`${venue.name}, ${venue.city}`}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {event.description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-2xl font-bold text-slate-900">
                About this event
              </h2>
              {/* Plain text only: React escapes it, so organizer-written text can never run as HTML. */}
              <p className="mt-3 whitespace-pre-line text-lg text-slate-700">{event.description}</p>
            </section>
          )}

          <section aria-labelledby="where-heading">
            <h2 id="where-heading" className="font-display text-2xl font-bold text-slate-900">
              Where
            </h2>
            <p className="mt-3 font-medium text-slate-900">{venue.name}</p>
            <p className="text-slate-600">{address}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline"
            >
              Open in Maps
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </section>

          <p className="text-slate-700">Organized by {event.organizerName}</p>
        </div>

        <aside aria-labelledby="tickets-heading" className="lg:col-span-1">
          <div className="rounded-xl bg-white p-5 shadow-xl ring-1 ring-black/5 lg:sticky lg:top-24">
            <h2 id="tickets-heading" className="font-display text-2xl font-bold text-slate-900">
              Tickets
            </h2>
            <div className="mt-4">
              <BookingPanel event={event} onStale={() => setReloads((count) => count + 1)} />
            </div>
            <p className="mt-4 text-xs text-slate-500">{cancellationNote(event.cancellationCutoffHours)}</p>
          </div>
        </aside>
      </div>
    </article>
  )
}