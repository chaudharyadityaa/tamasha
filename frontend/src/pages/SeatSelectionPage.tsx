import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { createBooking } from '../api/bookings'
import { toApiError, userMessage } from '../api/errors'
import type { SeatMapSection, SeatView } from '../api/seatTypes'
import { useAuth } from '../auth/useAuth'
import { SeatLegend } from '../components/seats/SeatLegend'
import { SeatSectionGrid } from '../components/seats/SeatSectionGrid'
import { SelectedSeatsPanel } from '../components/seats/SelectedSeatsPanel'
import type { SelectedSeat } from '../components/seats/SelectedSeatsPanel'
import { StageBar } from '../components/seats/StageBar'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useEventDetail } from '../hooks/useEventDetail'
import { useSeatMap } from '../hooks/useSeatMap'
import { formatDateRange, formatMoney } from '../lib/format'
import { newIdempotencyKey } from '../lib/idempotency'
import { sumLines } from '../lib/money'

// The server allows at most 20 seats in one booking.
const MAX_SEATS_PER_BOOKING = 20
const REFRESH_INTERVAL_MS = 20_000

export function SeatSelectionPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <NotFoundMessage />
  }
  // Keyed by id so moving to another event never shows the previous event's seats.
  return <SeatSelectionView key={id} id={id} />
}

function NotFoundMessage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
      <p className="mt-2 text-slate-600">This event does not exist, or it is no longer available.</p>
      <Link to="/events" className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Browse all events
      </Link>
    </div>
  )
}

function SeatSelectionView({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { status } = useAuth()
  const [reloads, setReloads] = useState(0)
  const detail = useEventDetail(id, 0)
  const map = useSeatMap(id, reloads)

  const [selected, setSelected] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptKey = useRef<string | null>(null)

  // Keep the map fresh while the person decides, but only while the tab is visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setReloads((count) => count + 1)
      }
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const seatMap = map.seatMap
  const index = useMemo(() => {
    const seats = new Map<number, SelectedSeat>()
    seatMap?.sections.forEach((section) => section.seats.forEach((seat) => seats.set(seat.id, { seat, section })))
    return seats
  }, [seatMap])

  // The selection is derived from the latest map: a seat that was taken meanwhile simply drops out.
  const effective = selected.filter((seatId) => {
    const entry = index.get(seatId)
    return entry !== undefined && entry.seat.status === 'AVAILABLE' && entry.section.onSale
  })
  const droppedCount = selected.length - effective.length
  const effectiveSet = new Set(effective)
  const selectedSeats = effective.map((seatId) => index.get(seatId)).filter((entry): entry is SelectedSeat => entry !== undefined)
  const total = sumLines(selectedSeats.map(({ section }) => ({ price: section.price, quantity: 1 })))

  function sectionCap(section: SeatMapSection): number {
    return detail.event?.ticketTypes.find((type) => type.id === section.ticketTypeId)?.maxPerBooking ?? 0
  }

  function sectionRoom(section: SeatMapSection): number {
    return sectionCap(section) - selectedSeats.filter((entry) => entry.section.ticketTypeId === section.ticketTypeId).length
  }

  const overallRoom = MAX_SEATS_PER_BOOKING - effective.length

  function change(next: number[]) {
    setSelected(next)
    attemptKey.current = null // a different selection is a different booking attempt
    setError(null)
  }

  function toggle(seat: SeatView) {
    if (effectiveSet.has(seat.id)) {
      change(effective.filter((seatId) => seatId !== seat.id))
      return
    }
    const entry = index.get(seat.id)
    if (!entry || sectionRoom(entry.section) <= 0 || overallRoom <= 0) {
      return
    }
    change([...effective, seat.id])
  }

  async function reserve() {
    if (status !== 'authenticated') {
      void navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (effective.length === 0) {
      setError('Choose at least one seat.')
      return
    }
    setSubmitting(true)
    setError(null)
    const key = attemptKey.current ?? newIdempotencyKey()
    attemptKey.current = key
    try {
      const booking = await createBooking({ eventId: Number(id), seatIds: effective }, key)
      attemptKey.current = null
      void navigate(`/bookings/${booking.id}`)
    } catch (caught: unknown) {
      const apiError = toApiError(caught)
      setError(userMessage(caught))
      if (apiError.status === 409 || apiError.status === 404) {
        attemptKey.current = null
        setReloads((count) => count + 1) // somebody was faster: show the real state of the seats
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (map.outcome === 'not-found' || detail.notFound) {
    return <NotFoundMessage />
  }
  if (map.outcome === 'not-reserved') {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">This event does not use seat selection</h1>
        <p className="mt-2 text-slate-600">Choose your tickets on the event page instead.</p>
        <Link to={`/events/${id}`} className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Back to the event
        </Link>
      </div>
    )
  }
  const loadError = map.error ?? detail.error
  if (loadError && !seatMap) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{loadError}</Alert>
        <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
          Try again
        </Button>
      </div>
    )
  }
  if (map.loading || detail.loading || !seatMap || !detail.event) {
    return <Spinner label="Loading the seat map…" />
  }

  const event = detail.event

  return (
    <div>
      <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to the event
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">Choose your seats</h1>
      <p className="mt-1 text-slate-600">
        {event.title} · {formatDateRange(event.startsAt, event.endsAt, event.venue.timeZone)}
      </p>

      <div className="mt-4 space-y-3">
        {map.error && <Alert variant="info">We could not refresh the seat map just now, so what you see may be a little out of date.</Alert>}
        {droppedCount > 0 && (
          <Alert variant="info">
            {droppedCount === 1 ? 'A seat you picked is' : `${droppedCount} seats you picked are`} no longer available and{' '}
            {droppedCount === 1 ? 'was' : 'were'} removed from your selection.
          </Alert>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-midnight p-4 text-white shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SeatLegend />
              <Button variant="onDark" onClick={() => setReloads((count) => count + 1)} disabled={map.refreshing}>
                <RefreshCw className={`h-4 w-4 ${map.refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh seats
              </Button>
            </div>

            <StageBar />

            {seatMap.sections.length === 0 && <p className="mt-6 text-white/70">No seats are on sale for this event.</p>}

            <div className="mt-6 space-y-10">
              {seatMap.sections.map((section) => (
                <section key={section.ticketTypeId} aria-labelledby={`section-${section.ticketTypeId}`}>
                  <h2 id={`section-${section.ticketTypeId}`} className="font-display text-xl font-bold text-white">
                    {section.name}
                    <span className="ml-3 text-base font-normal text-white/70">
                      {section.price === 0 ? 'Free' : formatMoney(section.price, seatMap.currency)} per seat
                    </span>
                  </h2>
                  {!section.onSale && <p className="mt-1 text-sm font-medium text-marigold">Sales for this section are not open.</p>}
                  <p className="mt-1 text-xs text-white/60">Up to {sectionCap(section)} seats per booking in this section.</p>
                  <div className="mt-3">
                    <SeatSectionGrid
                      section={section}
                      currency={seatMap.currency}
                      selectedIds={effectiveSet}
                      sectionRoom={sectionRoom(section)}
                      overallRoom={overallRoom}
                      onToggle={toggle}
                    />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <SelectedSeatsPanel
              selected={selectedSeats}
              currency={seatMap.currency}
              total={total}
              authenticated={status === 'authenticated'}
              loggingIn={status === 'loading'}
              submitting={submitting}
              error={error}
              onRemove={(seatId) => change(effective.filter((current) => current !== seatId))}
              onReserve={reserve}
            />
          </div>
        </div>
      </div>
    </div>
  )
}