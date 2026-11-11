import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listAdminBookings } from '../api/admin'
import { AdminBookingFiltersForm } from '../components/admin/AdminBookingFiltersForm'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { usePagedList } from '../hooks/usePagedList'
import {
  ADMIN_BOOKINGS_PAGE_SIZE,
  buildAdminBookingSearch,
  readAdminBookingFilters,
  toAdminBookingsParams,
} from '../lib/adminBookingSearch'
import type { AdminBookingFilters } from '../lib/adminBookingSearch'
import { BOOKING_STATUS } from '../lib/bookingStatus'
import { formatShortLocal } from '../lib/displayFormat'
import { readPage } from '../lib/eventSearch'
import { formatMoney } from '../lib/format'

const loadBookings = (search: string, signal: AbortSignal) =>
  listAdminBookings(toAdminBookingsParams(new URLSearchParams(search)), signal)

export function AdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchString = searchParams.toString()
  const filters = readAdminBookingFilters(searchParams)
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const { data, loading, error } = usePagedList(loadBookings, searchString, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function applyFilters(next: AdminBookingFilters) {
    setSearchParams(buildAdminBookingSearch(next, 1))
  }

  function goToPage(next: number) {
    setSearchParams(buildAdminBookingSearch(filters, next))
    headingRef.current?.focus()
  }

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none">
        Bookings
      </h2>

      <div className="mt-4">
        <AdminBookingFiltersForm key={searchString} initial={filters} onApply={applyFilters} />
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
        {!error && loading && !data && <Spinner label="Loading bookings…" />}
        {!error && data && data.content.length === 0 && <p className="py-8 text-center text-slate-600">No bookings match your search.</p>}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Showing {data.page * ADMIN_BOOKINGS_PAGE_SIZE + 1}–{data.page * ADMIN_BOOKINGS_PAGE_SIZE + data.content.length} of{' '}
              {data.totalElements}. Times are in your local time.
            </p>
            <div
              className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${loading ? 'opacity-60 transition-opacity' : ''}`}
              aria-busy={loading}
            >
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Bookings on the platform</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Reference</th>
                    <th scope="col" className="px-4 py-2 font-medium">Customer</th>
                    <th scope="col" className="px-4 py-2 font-medium">Event</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">Total</th>
                    <th scope="col" className="px-4 py-2 font-medium">Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((booking) => {
                    const status = BOOKING_STATUS[booking.status]
                    return (
                      <tr key={booking.id} className="align-top">
                        <th scope="row" className="px-4 py-3 font-mono font-medium">
                          <Link to={`/admin/bookings/${booking.id}`} className="text-indigo-700 hover:underline">
                            {booking.reference}
                          </Link>
                        </th>
                        <td className="px-4 py-3 text-slate-700">
                          {booking.customerName}
                          <span className="block text-xs text-slate-500">{booking.customerEmail}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {booking.eventTitle}
                          <span className="block text-xs text-slate-500">ID {booking.eventId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {booking.totalAmount === 0 ? 'Free' : formatMoney(booking.totalAmount, booking.currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatShortLocal(booking.createdAt)}</td>
                      </tr>
                    )
                  })}
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