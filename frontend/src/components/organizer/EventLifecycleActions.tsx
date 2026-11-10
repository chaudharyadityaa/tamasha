import { useState } from 'react'
import { userMessage } from '../../api/errors'
import { cancelEvent, publishEvent, unpublishEvent } from '../../api/organizer'
import type { OrganizerEvent } from '../../api/organizerTypes'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'

type Kind = 'publish' | 'unpublish' | 'cancel'

const DONE: Record<Kind, string> = {
  publish: 'The event is now published and visible to everyone.',
  unpublish: 'The event is unpublished and hidden from the public.',
  cancel: 'The event was cancelled.',
}

interface EventLifecycleActionsProps {
  event: OrganizerEvent
  /** How many ticket types the event has, or null while that is still loading. */
  ticketTypeCount: number | null
  /** Called with the event the server returns, so the page shows the new status at once. */
  onChanged: (event: OrganizerEvent) => void
}

export function EventLifecycleActions({ event, ticketTypeCount, onChanged }: EventLifecycleActionsProps) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  async function run(kind: Kind, action: (id: number) => Promise<OrganizerEvent>) {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      const updated = await action(event.id)
      setConfirmingCancel(false)
      setNotice(DONE[kind])
      onChanged(updated)
    } catch (caught: unknown) {
      // The server explains why (no ticket types yet, active bookings, ...). We show it as it is.
      setError(userMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-label="Event status" className="mt-4 space-y-3">
      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      {event.status === 'CANCELLED' ? (
        <Alert variant="info">This event was cancelled. Its bookings were cancelled and refunded, and it cannot be reopened.</Alert>
      ) : (
        <>
          {event.status === 'DRAFT' && (
            <div>
              <Button loading={busy === 'publish'} disabled={busy !== null} onClick={() => run('publish', publishEvent)}>
                Publish
              </Button>
              <p className="mt-1 text-sm text-slate-600">
                {ticketTypeCount === 0
                  ? 'Add at least one ticket type before publishing.'
                  : 'Publishing makes the event visible to everyone and opens booking.'}
              </p>
            </div>
          )}

          {event.status === 'PUBLISHED' && (
            <div>
              <Button variant="secondary" loading={busy === 'unpublish'} disabled={busy !== null} onClick={() => run('unpublish', unpublishEvent)}>
                Unpublish
              </Button>
              <p className="mt-1 text-sm text-slate-600">
                Unpublishing hides the event from the public. It is refused while customers have active bookings.
              </p>
            </div>
          )}

          {!confirmingCancel ? (
            <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirmingCancel(true)}>
              Cancel event
            </Button>
          ) : (
            <div role="group" aria-label="Confirm cancelling the event" className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">Cancel this event? This is permanent.</p>
              <p className="mt-1 text-sm text-red-900">
                Every booking for the event is cancelled, held seats and tickets are released, and demo payments are refunded.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" loading={busy === 'cancel'} disabled={busy !== null} onClick={() => run('cancel', cancelEvent)}>
                  Yes, cancel event
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                  Keep event
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}