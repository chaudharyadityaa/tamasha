import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { BookingBucket } from '../api/bookingTypes'
import { BookingSummaryCard } from '../components/bookings/BookingSummaryCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { MY_BOOKINGS_PAGE_SIZE, useMyBookings } from '../hooks/useMyBookings'
import { readPage } from '../lib/eventSearch'

const TABS: { value: BookingBucket; label: string; empty: string }[] = [
  { value: 'upcoming', label: 'Upcoming', empty: 'You have no upcoming bookings.' },
  { value: 'past', label: 'Past', empty: 'You have no past bookings yet.' },
  { value: 'cancelled', label: 'Cancelled', empty: 'No cancelled or expired bookings.' },
  { value: 'all', label: 'All', empty: 'You have not made any bookings yet.' },
]

function readTab(search: URLSearchParams): BookingBucket {
  const value = search.get('tab')
  return TABS.find((tab) => tab.value === value)?.value ?? 'upcoming'
}

function tabSearch(tab: BookingBucket): string {
  return tab === 'upcoming' ? '' : `?tab=${tab}`
}

export function MyBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = readTab(searchParams)
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const { data, loading, error } = useMyBookings(tab, page, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const current = TABS.find((candidate) => candidate.value === tab) ?? TABS[0]!

  function goToPage(next: number) {
    const search = new URLSearchParams(searchParams)
    if (next > 1) {
      search.set('page', String(next))
    } else {
      search.delete('page')
    }
    setSearchParams(search)
    headingRef.current?.focus() // keyboard and screen-reader users land at the top of the new page
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
        My bookings
      </h1>

      <nav aria-label="Booking filters" className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {TABS.map((candidate) => (
            <li key={candidate.value}>
              <Link
                to={{ pathname: '/my-bookings', search: tabSearch(candidate.value) }}
                aria-current={candidate.value === tab ? 'page' : undefined}
                className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  candidate.value === tab ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100'
                }`}
              >
                {candidate.label}
              </Link>
            </li>
          ))}
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

        {!error && loading && !data && <Spinner label="Loading your bookings…" />}

        {!error && data && data.content.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-700">{current.empty}</p>
            <Link to="/events" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">
              Browse events
            </Link>
          </div>
        )}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600" aria-live="polite">
              Showing {data.page * MY_BOOKINGS_PAGE_SIZE + 1}–{data.page * MY_BOOKINGS_PAGE_SIZE + data.content.length} of{' '}
              {data.totalElements}
            </p>
            <ul className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
              {data.content.map((booking) => (
                <BookingSummaryCard key={booking.id} booking={booking} />
              ))}
            </ul>
          </>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}