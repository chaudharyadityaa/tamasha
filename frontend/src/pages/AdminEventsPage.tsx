import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listAdminEvents } from '../api/admin'
import { AdminEventFiltersForm } from '../components/admin/AdminEventFiltersForm'
import { AdminEventRow } from '../components/admin/AdminEventRow'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { usePagedList } from '../hooks/usePagedList'
import {
  ADMIN_EVENTS_PAGE_SIZE,
  buildAdminEventSearch,
  readAdminEventFilters,
  toAdminEventsParams,
} from '../lib/adminEventSearch'
import type { AdminEventFilters } from '../lib/adminEventSearch'
import { readPage } from '../lib/eventSearch'

const loadEvents = (search: string, signal: AbortSignal) =>
  listAdminEvents(toAdminEventsParams(new URLSearchParams(search)), signal)

export function AdminEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchString = searchParams.toString()
  const filters = readAdminEventFilters(searchParams)
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const { data, loading, error } = usePagedList(loadEvents, searchString, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function applyFilters(next: AdminEventFilters) {
    setNotice(null)
    setSearchParams(buildAdminEventSearch(next, 1))
  }

  function goToPage(next: number) {
    setSearchParams(buildAdminEventSearch(filters, next))
    headingRef.current?.focus()
  }

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none">
        Events
      </h2>

      <div className="mt-4">
        <AdminEventFiltersForm key={searchString} initial={filters} onApply={applyFilters} />
      </div>

      <div className="mt-4" aria-live="polite">
        {notice && <Alert variant="success">{notice}</Alert>}
      </div>

      <div className="mt-4">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}
        {!error && loading && !data && <Spinner label="Loading events…" />}
        {!error && data && data.content.length === 0 && <p className="py-8 text-center text-slate-600">No events match your search.</p>}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Showing {data.page * ADMIN_EVENTS_PAGE_SIZE + 1}–{data.page * ADMIN_EVENTS_PAGE_SIZE + data.content.length} of{' '}
              {data.totalElements}. Times are in your local time. Prices are in each event&rsquo;s own currency.
            </p>
            <div
              className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${loading ? 'opacity-60 transition-opacity' : ''}`}
              aria-busy={loading}
            >
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Events on the platform</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Event</th>
                    <th scope="col" className="px-4 py-2 font-medium">Organizer</th>
                    <th scope="col" className="px-4 py-2 font-medium">Venue</th>
                    <th scope="col" className="px-4 py-2 font-medium">Starts</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">Starting price</th>
                    <th scope="col" className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((event) => (
                    <AdminEventRow
                      key={event.id}
                      event={event}
                      onChanged={(message) => {
                        setNotice(message)
                        setReloads((count) => count + 1) // show what the server really stored
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}