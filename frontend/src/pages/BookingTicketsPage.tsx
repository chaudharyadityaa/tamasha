import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { TicketCard } from '../components/tickets/TicketCard'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useBookingTickets } from '../hooks/useBookingTickets'

export function BookingTicketsPage() {
  const { id = '' } = useParams()
  const validId = /^\d+$/.test(id)
  const [reloads, setReloads] = useState(0)
  const { tickets, loading, error, notFound } = useBookingTickets(validId ? id : null, reloads)

  if (!validId || notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Tickets not found</h1>
        <p className="mt-2 text-slate-600">This booking does not exist, or it belongs to another account.</p>
        <Link to="/my-bookings" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Back to my bookings
        </Link>
      </div>
    )
  }
  if (loading) {
    return <Spinner label="Loading your tickets…" />
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
  if (!tickets) {
    return null
  }

  const reference = tickets[0]?.bookingReference

  return (
    <div>
      <div className="print:hidden">
        <Link to={`/bookings/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the booking
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Your tickets{reference ? <span className="ml-2 font-mono text-lg text-slate-500">{reference}</span> : null}
        </h1>
        {tickets.length > 0 && (
          <Button variant="secondary" className="print:hidden" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print tickets
          </Button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-700">No tickets yet. Tickets are issued as soon as the booking is paid.</p>
          <Link to={`/bookings/${id}`} className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">
            Go to the booking
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </ul>
      )}
    </div>
  )
}