import { Link } from 'react-router-dom'
import type { EventSummary } from '../../api/types'
import { EventCard } from '../events/EventCard'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

export type RailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: EventSummary[] }

interface SoonRailProps {
  state: RailState
  onRetry: () => void
}

export function SoonRail({ state, onRetry }: SoonRailProps) {
  return (
    <section aria-labelledby="soon-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <h2 id="soon-heading" className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
          Happening soon
        </h2>
        <Link to="/events" className="text-sm font-semibold text-indigo-700 hover:underline">
          See all events
        </Link>
      </div>

      <div className="mt-6">
        {state.status === 'loading' && (
          <>
            <p role="status" className="sr-only">
              Loading events
            </p>
            <ul aria-hidden="true" className="flex gap-5 overflow-hidden">
              {Array.from({ length: 5 }, (_, index) => (
                <li key={index} className="aspect-[3/5] w-56 shrink-0 animate-pulse rounded-md bg-slate-200 sm:w-64" />
              ))}
            </ul>
          </>
        )}

        {state.status === 'error' && (
          <div className="space-y-3">
            <Alert variant="error">{state.message}</Alert>
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}

        {state.status === 'ready' && state.events.length === 0 && (
          <p className="py-8 text-slate-600">No upcoming events yet. New nights are added all the time, so check back soon.</p>
        )}

        {state.status === 'ready' && state.events.length > 0 && (
          <div
            role="region"
            aria-label="Upcoming events"
            tabIndex={0}
            className="-mx-4 overflow-x-auto px-4 pb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 sm:-mx-6 sm:px-6"
          >
            <ul className="flex snap-x snap-mandatory gap-5">
              {state.events.map((event) => (
                <EventCard key={event.id} event={event} className="w-56 shrink-0 snap-start sm:w-64" />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}