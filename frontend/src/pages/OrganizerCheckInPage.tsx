import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toApiError } from '../api/errors'
import { getOrganizerEvent } from '../api/organizer'
import { checkInTicket, getAttendance } from '../api/organizerOperations'
import type { CheckInResult } from '../api/organizerOperationsTypes'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { TextField } from '../components/ui/TextField'
import { useApiResource } from '../hooks/useApiResource'
import { checkInFailureMessage } from '../lib/checkInMessages'
import { formatDateRange } from '../lib/format'

interface Outcome {
  id: number
  ok: boolean
  title: string
  detail: string
  /** Only the end of the code is kept, to recognise it in the recent list. */
  codeEnd: string
  time: string
}

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

function describeSuccess(result: CheckInResult): Pick<Outcome, 'ok' | 'title' | 'detail'> {
  if (result.status !== 'CHECKED_IN') {
    return { ok: false, title: 'Not admitted', detail: `This ticket's status is ${result.status}.` }
  }
  const seat = result.seat ? `${result.seat.section} · Row ${result.seat.row} · Seat ${result.seat.number}` : 'General admission'
  return { ok: true, title: 'Admitted', detail: `${result.holderName} · ${result.ticketTypeName} · ${seat}` }
}

export function OrganizerCheckInPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <EventNotFound />
  }
  return <CheckInView key={id} eventId={Number(id)} />
}

function CheckInView({ eventId }: { eventId: number }) {
  const event = useApiResource(getOrganizerEvent, eventId, 0)
  const [reloads, setReloads] = useState(0)
  const attendance = useApiResource(getAttendance, eventId, reloads)
  const [code, setCode] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [last, setLast] = useState<Outcome | null>(null)
  const [history, setHistory] = useState<Outcome[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const counter = useRef(0)

  async function attempt(value: string): Promise<{ outcome: Outcome; keepCode: boolean }> {
    const base = {
      id: (counter.current += 1),
      codeEnd: `…${value.slice(-6)}`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
    try {
      return { outcome: { ...base, ...describeSuccess(await checkInTicket(eventId, value)) }, keepCode: false }
    } catch (caught: unknown) {
      return {
        outcome: { ...base, ok: false, title: 'Not admitted', detail: checkInFailureMessage(caught) },
        // After a network failure the code is kept so staff can simply try again.
        keepCode: toApiError(caught).isNetworkError,
      }
    }
  }

  async function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const value = code.trim()
    if (!value) {
      setInputError('Enter or scan a ticket code.')
      return
    }
    setInputError(null)
    setSubmitting(true)
    const { outcome, keepCode } = await attempt(value)
    setLast(outcome)
    setHistory((current) => [outcome, ...current].slice(0, 8))
    if (!keepCode) {
      setCode('')
    }
    setSubmitting(false)
    setReloads((count) => count + 1) // refresh the attendance numbers
    formRef.current?.querySelector('input')?.focus() // ready for the next scan
  }

  if (event.notFound) {
    return <EventNotFound />
  }

  const counts = attendance.data
  const percent = counts && counts.total > 0 ? Math.round((counts.checkedIn / counts.total) * 100) : 0

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/organizer/events/${eventId}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to the event
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Check-in</h1>
      {event.data ? (
        <p className="mt-1 text-slate-600">
          {event.data.title} · {formatDateRange(event.data.startsAt, event.data.endsAt, event.data.venue.timeZone)}
        </p>
      ) : event.error ? (
        <div className="mt-3"><Alert variant="error">{event.error}</Alert></div>
      ) : (
        <Spinner label="Loading the event…" />
      )}

      <section aria-labelledby="attendance-heading" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="attendance-heading" className="text-base font-semibold text-slate-900">
          Attendance
        </h2>
        {attendance.error && <p className="mt-2 text-sm text-red-600">{attendance.error}</p>}
        {counts ? (
          <>
            <p className="mt-1 text-2xl font-bold text-slate-900" aria-live="polite">
              {counts.checkedIn} of {counts.total} checked in
            </p>
            <div
              role="progressbar"
              aria-label="Checked in"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
            >
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {counts.notYetArrived} not yet arrived · {counts.voided} cancelled tickets
            </p>
          </>
        ) : (
          !attendance.error && <Spinner label="Loading attendance…" />
        )}
      </section>

        <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-3">
        <TextField
          
          label="Ticket code"
          hint="Scan the QR code with a scanner, or type the code and press Enter."
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          readOnly={submitting}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={inputError}
          
        />
        <Button type="submit" loading={submitting}>
          Check in
        </Button>
      </form>

      <div className="mt-6" aria-live="polite">
        {last && (
          <Alert variant={last.ok ? 'success' : 'error'}>
            <p className="text-lg font-semibold">{last.title}</p>
            <p className="mt-1">{last.detail}</p>
          </Alert>
        )}
      </div>

      {history.length > 0 && (
        <section aria-labelledby="recent-heading" className="mt-6">
          <h2 id="recent-heading" className="text-base font-semibold text-slate-900">
            Recent scans
          </h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className={item.ok ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>{item.title}</span>
                <span className="text-slate-600">{item.detail}</span>
                <span className="font-mono text-xs text-slate-500">
                  {item.codeEnd} · {item.time}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}