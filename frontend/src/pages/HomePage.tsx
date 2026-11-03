import { useEffect, useState } from 'react'
import { searchEvents } from '../api/events'
import { userMessage } from '../api/errors'
import type { EventSummary } from '../api/types'
import { EventCard } from '../components/events/EventCard'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: EventSummary[] }

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    searchEvents({ size: 6, sort: 'date' }, controller.signal)
      .then((page) => setState({ status: 'ready', events: page.content }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <div>
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-12 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Find your next event</h1>
        <p className="mt-3 max-w-xl text-indigo-100">
          Concerts, shows and more. Pick your seats or grab tickets, and keep them all in one place.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="text-xl font-semibold text-slate-900">
          Upcoming events
        </h2>

        <div className="mt-4">
          {state.status === 'loading' && <Spinner label="Loading events…" />}
          {state.status === 'error' && <Alert variant="error">{state.message}</Alert>}
          {state.status === 'ready' && state.events.length === 0 && (
            <p className="py-8 text-center text-slate-500">No upcoming events right now. Please check back soon.</p>
          )}
          {state.status === 'ready' && state.events.length > 0 && (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {state.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}