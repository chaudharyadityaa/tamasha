import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createBooking } from '../../api/bookings'
import { toApiError, userMessage } from '../../api/errors'
import type { EventDetail, PublicTicketType } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { formatMoney } from '../../lib/format'
import { newIdempotencyKey } from '../../lib/idempotency'
import { sumLines } from '../../lib/money'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { QuantityStepper } from '../ui/QuantityStepper'
import { TicketTypeList } from './TicketTypeList'

// The server allows at most 20 tickets in one booking. We stop people at 20 so they cannot pick the impossible.
const MAX_TICKETS_PER_BOOKING = 20

interface BookingPanelProps {
  event: EventDetail
  /** Called when the server says our view of availability is out of date, so the page can reload it. */
  onStale: () => void
}

function isSelectable(ticket: PublicTicketType): boolean {
  return ticket.onSale && (ticket.quantityRemaining ?? 0) > 0
}

function perTypeCap(ticket: PublicTicketType): number {
  return Math.min(ticket.maxPerBooking, ticket.quantityRemaining ?? 0)
}

export function BookingPanel({ event, onStale }: BookingPanelProps) {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptKey = useRef<string | null>(null)

  // What is actually selected, never more than what is currently allowed (availability can change on reload).
  const quantityOf = (ticket: PublicTicketType): number =>
    isSelectable(ticket) ? Math.min(quantities[ticket.id] ?? 0, perTypeCap(ticket)) : 0

  const selected = event.ticketTypes.filter((ticket) => quantityOf(ticket) > 0)
  const totalTickets = selected.reduce((sum, ticket) => sum + quantityOf(ticket), 0)
  const total = sumLines(selected.map((ticket) => ({ price: ticket.price, quantity: quantityOf(ticket) })))

  function maxFor(ticket: PublicTicketType): number {
    const room = MAX_TICKETS_PER_BOOKING - (totalTickets - quantityOf(ticket))
    return Math.max(0, Math.min(perTypeCap(ticket), room))
  }

  function setQuantity(ticketId: number, value: number) {
    setQuantities((current) => ({ ...current, [ticketId]: value }))
    attemptKey.current = null // a different selection is a different booking attempt
    setError(null)
  }

  async function reserve() {
    if (status !== 'authenticated') {
      void navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (totalTickets === 0) {
      setError('Choose at least one ticket.')
      return
    }
    setSubmitting(true)
    setError(null)
    // The same key for the same attempt: a double click or a retry returns the same booking.
    const key = attemptKey.current ?? newIdempotencyKey()
    attemptKey.current = key
    try {
      const booking = await createBooking(
        {
          eventId: event.id,
          items: selected.map((ticket) => ({ ticketTypeId: ticket.id, quantity: quantityOf(ticket) })),
        },
        key,
      )
      attemptKey.current = null
      void navigate(`/bookings/${booking.id}`)
    } catch (caught: unknown) {
      const apiError = toApiError(caught)
      setError(userMessage(caught))
      if (apiError.status === 409 || apiError.status === 404) {
        attemptKey.current = null
        onStale() // tickets probably sold out or sales closed: show the real availability
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (event.seatingMode === 'RESERVED_SEATING') {
    const anyOnSale = event.ticketTypes.some((ticket) => ticket.onSale)
    return (
      <div>
        <TicketTypeList ticketTypes={event.ticketTypes} currency={event.currency} timeZone={event.venue.timeZone} />
        {anyOnSale ? (
          <Link
            to={`/events/${event.id}/seats`}
            className="mt-4 block rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Choose seats
          </Link>
        ) : (
          <Button className="mt-4 w-full" disabled>
            Sales not open
          </Button>
        )}
        <p className="mt-2 text-xs text-slate-500">Pick your exact seats on the seat map.</p>
      </div>
    )
  }

  return (
    <div>
      <TicketTypeList
        ticketTypes={event.ticketTypes}
        currency={event.currency}
        timeZone={event.venue.timeZone}
        renderAction={(ticket) =>
          isSelectable(ticket) ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Quantity</span>
              <QuantityStepper
                label={`${ticket.name} quantity`}
                value={quantityOf(ticket)}
                max={maxFor(ticket)}
                onChange={(value) => setQuantity(ticket.id, value)}
              />
            </div>
          ) : null
        }
      />

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">
        {totalTickets === 0
          ? 'No tickets selected yet.'
          : `${totalTickets} ticket${totalTickets === 1 ? '' : 's'} · Total ${total === 0 ? 'Free' : formatMoney(total, event.currency)}`}
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <Button className="mt-4 w-full" loading={submitting} disabled={status === 'loading'} onClick={reserve}>
        {status === 'anonymous' ? 'Log in to book' : 'Reserve tickets'}
      </Button>
      <p className="mt-2 text-xs text-slate-500">
        The final price is confirmed when you reserve. Tickets are held for a short time while you pay.
      </p>
    </div>
  )
}