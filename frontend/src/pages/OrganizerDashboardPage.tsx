import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { EventStatus } from '../api/organizerTypes'
import { OrganizerEventRow } from '../components/organizer/OrganizerEventRow'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { ORGANIZER_EVENTS_PAGE_SIZE, useOrganizerEvents } from '../hooks/useOrganizerEvents'
import { readPage } from '../lib/eventSearch'

const TABS: { value: EventStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function readStatus(search: URLSearchParams): EventStatus | undefined {
  const value = search.get('status')
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'CANCELLED' ? value : undefined
}

const buttonLink =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export function OrganizerDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = readStatus(searchParams)
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const { data, loading, error } = useOrganizerEvents(status, page, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function goToPage(next: number) {
    const search = new URLSearchParams(searchParams)
    if (next > 1) {
      search.set('page', String(next))
    } else {
      search.delete('page')
    }
    setSearchParams(search)
    headingRef.current?.focus()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
          Organizer dashboard
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link to="/organizer/venues" className={`${buttonLink} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>
            Venues
          </Link>
          <Link to="/organizer/events/new" className={`${buttonLink} bg-indigo-600 text-white hover:bg-indigo-700`}>
            New event
          </Link>
        </div>
      </div>

      <nav aria-label="Event status filters" className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = (status ?? 'ALL') === tab.value
            return (
              <li key={tab.value}>
                <Link
                  to={{ pathname: '/organizer', search: tab.value === 'ALL' ? '' : `?status=${tab.value}` }}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-6">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}

        {!error && loading && !data && <Spinner label="Loading your events…" />}

        {!error && data && data.content.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-700">{status ? 'No events with this status.' : 'You have no events yet.'}</p>
            {!status && (
              <p className="mt-1 text-sm text-slate-500">
                Start by adding a <Link to="/organizer/venues" className="font-medium text-indigo-700 hover:underline">venue</Link>, then create your first event.
              </p>
            )}
          </div>
        )}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600" aria-live="polite">
              Showing {data.page * ORGANIZER_EVENTS_PAGE_SIZE + 1}–{data.page * ORGANIZER_EVENTS_PAGE_SIZE + data.content.length} of {data.totalElements}
            </p>
            <ul className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
              {data.content.map((event) => (
                <OrganizerEventRow key={event.id} event={event} />
              ))}
            </ul>
          </>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}