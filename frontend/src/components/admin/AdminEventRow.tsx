import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cancelAdminEvent } from '../../api/admin'
import type { AdminEvent } from '../../api/adminTypes'
import { userMessage } from '../../api/errors'
import { formatPlainAmount, formatShortLocal } from '../../lib/displayFormat'
import { EVENT_STATUS, SEATING_LABEL } from '../../lib/eventStatus'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface AdminEventRowProps {
  event: AdminEvent
  /** Called after the server accepted the cancellation, so the page can say what happened and reload the list. */
  onChanged: (message: string) => void
}

export function AdminEventRow({ event, onChanged }: AdminEventRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = EVENT_STATUS[event.status]

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      await cancelAdminEvent(event.id)
      setConfirming(false)
      onChanged(`“${event.title}” was cancelled.`)
    } catch (caught: unknown) {
      // The server explains refusals, for example an event that is already cancelled.
      setError(userMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-3 font-medium text-slate-900">
        {event.title}
        <span className="block text-xs font-normal text-slate-500">{SEATING_LABEL[event.seatingMode]} · ID {event.id}</span>
      </th>
      <td className="px-4 py-3 text-slate-700">
        {event.organizerName}
        <span className="block text-xs text-slate-500">ID {event.organizerId}</span>
      </td>
      <td className="px-4 py-3 text-slate-700">
        {event.venueName}
        <span className="block text-xs text-slate-500">{event.city}</span>
      </td>
      <td className="px-4 py-3 text-slate-700">{formatShortLocal(event.startsAt)}</td>
      <td className="px-4 py-3">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-4 py-3 text-slate-700">{event.startingPrice === null ? '–' : formatPlainAmount(event.startingPrice)}</td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          {event.status === 'PUBLISHED' && (
            <Link to={`/events/${event.id}`} className="block text-sm font-medium text-indigo-700 hover:underline">
              Public page
            </Link>
          )}
          {event.status !== 'CANCELLED' &&
            (confirming ? (
              <div role="group" aria-label={`Confirm cancelling ${event.title}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">Cancel “{event.title}”? This is permanent.</p>
                <p className="mt-1 text-sm text-red-900">
                  Every booking for the event is cancelled, held seats and tickets are released, and demo payments are refunded.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="danger" loading={busy} disabled={busy} onClick={cancel}>
                    Yes, cancel event
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Keep event
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                aria-label={`Cancel ${event.title}`}
                onClick={() => {
                  setError(null)
                  setConfirming(true)
                }}
              >
                Cancel event
              </Button>
            ))}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      </td>
    </tr>
  )
}