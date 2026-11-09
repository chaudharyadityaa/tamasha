import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { cancelBooking, payWithDemo } from '../api/bookings'
import type { Booking } from '../api/bookingTypes'
import { toApiError, userMessage } from '../api/errors'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useBooking } from '../hooks/useBooking'
import { useNowSeconds } from '../hooks/useNowSeconds'
import { BOOKING_STATUS } from '../lib/bookingStatus'
import { formatCountdown } from '../lib/countdown'
import { formatLocalDateTime, formatMoney } from '../lib/format'

function actionMessage(error: unknown, action: 'pay' | 'cancel'): string {
  if (action === 'pay' && toApiError(error).status === 404) {
    return 'Demo payments are not enabled on this server.'
  }
  return userMessage(error)
}

function paymentNote(booking: Booking): string | null {
  const payment = booking.payment
  if (!payment) {
    return null
  }
  if (!payment.demo) {
    return `Payment: ${payment.provider} (${payment.status.toLowerCase()})`
  }
  return payment.status === 'REFUNDED'
    ? 'The demo payment was refunded (no real money moved).'
    : 'Paid with a demo payment (no real money moved).'
}

export function BookingPage() {
  const { id = '' } = useParams()
  // Keyed by id so moving between bookings never shows stale data from the previous one.
  return <BookingView key={id} id={id} />
}

function BookingView({ id }: { id: string }) {
  const validId = /^\d+$/.test(id)
  const [reloads, setReloads] = useState(0)
  const { booking: loaded, loading, error, notFound } = useBooking(validId ? id : null, reloads)
  const [updated, setUpdated] = useState<Booking | null>(null)
  const [action, setAction] = useState<'idle' | 'paying' | 'cancelling'>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const nowSeconds = useNowSeconds()

  const booking = updated ?? loaded

  if (!validId || notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Booking not found</h1>
        <p className="mt-2 text-slate-600">This booking does not exist, or it belongs to another account.</p>
        <Link to="/events" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Browse events
        </Link>
      </div>
    )
  }
  if (loading) {
    return <Spinner label="Loading your booking…" />
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
  if (!booking) {
    return null
  }

  const current: Booking = booking
  const pending = current.status === 'PENDING_PAYMENT'
  const confirmed = current.status === 'CONFIRMED'
  const remaining = pending ? Math.max(0, Math.floor(new Date(current.expiresAt).getTime() / 1000) - nowSeconds) : 0
  const holdExpired = pending && remaining === 0
  const canCancel = (pending && !holdExpired) || confirmed
  const status = BOOKING_STATUS[current.status]
  const note = paymentNote(current)
  const payLabel =
    current.totalAmount === 0
      ? 'Confirm free booking (demo)'
      : `Pay ${formatMoney(current.totalAmount, current.currency)} (demo)`

  async function pay() {
    setAction('paying')
    setActionError(null)
    try {
      setUpdated(await payWithDemo(current.id))
    } catch (caught: unknown) {
      setActionError(actionMessage(caught, 'pay'))
    } finally {
      setAction('idle')
    }
  }

  async function cancel() {
    setAction('cancelling')
    setActionError(null)
    try {
      setUpdated(await cancelBooking(current.id))
      setConfirmingCancel(false)
    } catch (caught: unknown) {
      setActionError(actionMessage(caught, 'cancel'))
    } finally {
      setAction('idle')
    }
  }

  return (
    <article className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Booking {current.reference}</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <section aria-labelledby="summary-heading" className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="summary-heading" className="text-lg font-semibold text-slate-900">
          <Link to={`/events/${current.eventId}`} className="hover:text-indigo-700 hover:underline">
            {current.eventTitle}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-slate-600">{formatLocalDateTime(current.eventStartsAt)}</p>

        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {current.items.map((item) => (
            <li key={item.ticketTypeId} className="flex justify-between gap-4 py-2">
              <span>
                {item.quantity} × {item.ticketTypeName}
              </span>
              <span className="font-medium">{formatMoney(item.lineTotal, current.currency)}</span>
            </li>
          ))}
          {current.seats.map((seat) => (
            <li key={seat.seatId} className="flex justify-between gap-4 py-2">
              <span>
                {seat.ticketTypeName}: section {seat.section}, row {seat.row}, seat {seat.number}
              </span>
              <span className="font-medium">{formatMoney(seat.unitPrice, current.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>{current.totalAmount === 0 ? 'Free' : formatMoney(current.totalAmount, current.currency)}</span>
        </p>
      </section>

      {actionError && (
        <div className="mt-4">
          <Alert variant="error">{actionError}</Alert>
        </div>
      )}

      {pending && !holdExpired && (
        <section aria-labelledby="pay-heading" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 id="pay-heading" className="text-lg font-semibold text-slate-900">
            Complete your booking
          </h2>
          <p role="timer" className="mt-1 flex items-center gap-2 text-sm text-amber-900">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Time left to pay: <strong>{formatCountdown(remaining)}</strong>
          </p>
          <p className="mt-3 text-sm text-slate-700">
            <strong>Demo payment.</strong> No real money is charged and no card details are collected. Pressing the
            button simulates a successful payment.
          </p>
          <Button className="mt-4" loading={action === 'paying'} disabled={action !== 'idle'} onClick={pay}>
            {payLabel}
          </Button>
        </section>
      )}

      {holdExpired && (
        <div className="mt-6">
          <Alert variant="info">
            Your hold has expired and the tickets were released.{' '}
            <Link to={`/events/${current.eventId}`} className="font-medium underline">
              Book again
            </Link>
          </Alert>
        </div>
      )}

      {confirmed && (
        <div className="mt-6">
          <Alert variant="success">
            <p className="font-semibold">Booking confirmed</p>
            <p className="mt-1">
              <Link to={`/bookings/${current.id}/tickets`} className="font-medium underline">
                View your tickets
              </Link>{' '}
              and show the QR code at the entrance.
            </p>
          </Alert>
        </div>
      )}

      {(current.status === 'CANCELLED' || current.status === 'EXPIRED') && (
        <div className="mt-6">
          <Alert variant="info">
            This booking is {current.status === 'CANCELLED' ? 'cancelled' : 'expired'}, and its tickets were released.{' '}
            <Link to={`/events/${current.eventId}`} className="font-medium underline">
              View the event
            </Link>
          </Alert>
        </div>
      )}

      {note && <p className="mt-4 text-sm text-slate-600">{note}</p>}

      {canCancel && (
        <div className="mt-6">
          {!confirmingCancel ? (
            <Button variant="secondary" onClick={() => setConfirmingCancel(true)}>
              Cancel booking
            </Button>
          ) : (
            <div role="group" aria-label="Confirm cancellation" className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-900">
                {confirmed
                  ? 'Cancel this booking? Your tickets will be voided and the demo payment refunded.'
                  : 'Cancel this booking and release your tickets?'}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" loading={action === 'cancelling'} disabled={action !== 'idle'} onClick={cancel}>
                  Yes, cancel booking
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                  Keep booking
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}