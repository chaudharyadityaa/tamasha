import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cancelAdminBooking, getAdminBooking } from '../api/admin'
import type { Booking } from '../api/bookingTypes'
import { userMessage } from '../api/errors'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useApiResource } from '../hooks/useApiResource'
import { BOOKING_STATUS } from '../lib/bookingStatus'
import { formatShortLocal } from '../lib/displayFormat'
import { formatMoney } from '../lib/format'

function paymentNote(booking: Booking): string | null {
  const payment = booking.payment
  if (!payment) {
    return null
  }
  const demo = payment.demo ? ' · demo payment, no real money moved' : ''
  return `Payment: ${payment.provider} · ${payment.status.toLowerCase()}${demo}`
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">Booking not found</h2>
      <Link to="/admin/bookings" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Back to bookings
      </Link>
    </div>
  )
}

export function AdminBookingDetailPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <NotFound />
  }
  // Keyed by id so moving between bookings never shows stale data from the previous one.
  return <DetailView key={id} id={Number(id)} />
}

function DetailView({ id }: { id: number }) {
  const loaded = useApiResource(getAdminBooking, id, 0)
  const [updated, setUpdated] = useState<Booking | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const booking = updated ?? loaded.data

  if (loaded.notFound) {
    return <NotFound />
  }
  if (loaded.loading) {
    return <Spinner label="Loading the booking…" />
  }
  if (loaded.error || !booking) {
    return <Alert variant="error">{loaded.error ?? 'The booking could not be loaded.'}</Alert>
  }

  const current: Booking = booking
  const status = BOOKING_STATUS[current.status]
  const cancellable = current.status === 'PENDING_PAYMENT' || current.status === 'CONFIRMED'
  const note = paymentNote(current)

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      setUpdated(await cancelAdminBooking(current.id))
      setConfirming(false)
      setNotice('The booking was cancelled.')
    } catch (caught: unknown) {
      // The server explains refusals, for example a booking that can no longer be cancelled.
      setError(userMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="max-w-2xl">
      <Link to="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All bookings
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-slate-900">
          Booking <span className="font-mono">{current.reference}</span>
        </h2>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {notice && (
        <div className="mt-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <section aria-labelledby="booking-summary" className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 id="booking-summary" className="text-lg font-semibold text-slate-900">
          {current.eventTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Event ID {current.eventId} · starts {formatShortLocal(current.eventStartsAt)} (your local time)
        </p>

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

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Booked</dt>
          <dd className="text-slate-900">{formatShortLocal(current.createdAt)}</dd>
        </div>
        {current.status === 'PENDING_PAYMENT' && (
          <div>
            <dt className="text-slate-500">Hold expires</dt>
            <dd className="text-slate-900">{formatShortLocal(current.expiresAt)}</dd>
          </div>
        )}
      </dl>

      {note && <p className="mt-4 text-sm text-slate-600">{note}</p>}

      {cancellable && (
        <div className="mt-6">
          {!confirming ? (
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Cancel booking
            </Button>
          ) : (
            <div role="group" aria-label="Confirm cancelling the booking" className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">Cancel this booking as an administrator?</p>
              <p className="mt-1 text-sm text-red-900">
                {current.status === 'CONFIRMED'
                  ? 'The tickets are voided and the demo payment is refunded.'
                  : 'The held seats and tickets are released.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" loading={busy} disabled={busy} onClick={cancel}>
                  Yes, cancel booking
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
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