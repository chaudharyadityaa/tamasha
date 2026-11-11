import { useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getOrganizerEvent } from '../api/organizer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { EVENT_BOOKINGS_PAGE_SIZE, useEventBookings } from '../hooks/useEventBookings'
import { useApiResource } from '../hooks/useApiResource'
import { BOOKING_STATUS } from '../lib/bookingStatus'
import { readPage } from '../lib/eventSearch'
import { formatMoney } from '../lib/format'

function EventNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
      <Link to="/organizer" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Back to the dashboard
      </Link>
    </div>
  )
}

const shortTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function OrganizerEventBookingsPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <EventNotFound />
  }
  return <BookingsView key={id} eventId={Number(id)} />
}

function BookingsView({ eventId }: { eventId: number }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const event = useApiResource(getOrganizerEvent, eventId, 0)
  const bookings = useEventBookings(eventId, page, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function goToPage(next: number) {
    setSearchParams(next > 1 ? { page: String(next) } : {})
    headingRef.current?.focus()
  }

  if (event.notFound) {
    return <EventNotFound />
  }
  const { data, loading, error } = bookings

  return (
    <div>
      <Link to={`/organizer/events/${eventId}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {event.data ? event.data.title : 'Back to the event'}
      </Link>
      <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-2xl font-bold text-slate-900 focus:outline-none">
        Bookings
      </h1>

      <div className="mt-6">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}
        {!error && loading && !data && <Spinner label="Loading bookings…" />}
        {!error && data && data.content.length === 0 && <p className="py-8 text-center text-slate-600">No bookings for this event yet.</p>}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600" aria-live="polite">
              Showing {data.page * EVENT_BOOKINGS_PAGE_SIZE + 1}–{data.page * EVENT_BOOKINGS_PAGE_SIZE + data.content.length} of {data.totalElements}. Times are in your local time.
            </p>
            <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Bookings for this event</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Reference</th>
                    <th scope="col" className="px-4 py-2 font-medium">Customer</th>
                    <th scope="col" className="px-4 py-2 font-medium">Status</th>
                    <th scope="col" className="px-4 py-2 font-medium">Total</th>
                    <th scope="col" className="px-4 py-2 font-medium">Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((booking) => (
                    <tr key={booking.id}>
                      <th scope="row" className="px-4 py-2 font-mono font-medium text-slate-900">{booking.reference}</th>
                      <td className="px-4 py-2">{booking.customerName}</td>
                      <td className="px-4 py-2">
                        <Badge tone={BOOKING_STATUS[booking.status].tone}>{BOOKING_STATUS[booking.status].label}</Badge>
                      </td>
                      <td className="px-4 py-2">{booking.totalAmount === 0 ? 'Free' : formatMoney(booking.totalAmount, booking.currency)}</td>
                      <td className="px-4 py-2">{shortTime(booking.createdAt)}</td>
                    </tr>
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