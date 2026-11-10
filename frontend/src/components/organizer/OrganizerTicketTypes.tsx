import { useState } from 'react'
import { deleteTicketType } from '../../api/organizer'
import type { OrganizerTicketType } from '../../api/organizerInventoryTypes'
import type { OrganizerEvent } from '../../api/organizerTypes'
import { userMessage } from '../../api/errors'
import { formatDateTime, formatMoney } from '../../lib/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { TicketTypeForm } from './TicketTypeForm'

interface OrganizerTicketTypesProps {
  event: OrganizerEvent
  /** null until the first load has finished. */
  ticketTypes: OrganizerTicketType[] | null
  loadError: string | null
  /** Reload the list (after adding, deleting or when "Try again" is pressed). */
  onChanged: () => void
}

function salesWindow(ticket: OrganizerTicketType, timeZone: string): string {
  if (!ticket.salesStart && !ticket.salesEnd) {
    return 'No sales window: on sale while the event is published.'
  }
  const parts: string[] = []
  if (ticket.salesStart) {
    parts.push(`Sales open ${formatDateTime(ticket.salesStart, timeZone)}`)
  }
  if (ticket.salesEnd) {
    parts.push(`Sales close ${formatDateTime(ticket.salesEnd, timeZone)}`)
  }
  return parts.join(' · ')
}

export function OrganizerTicketTypes({ event, ticketTypes, loadError, onChanged }: OrganizerTicketTypesProps) {
  const [showForm, setShowForm] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const editable = event.status !== 'CANCELLED'

  async function remove(ticket: OrganizerTicketType) {
    setDeletingId(ticket.id)
    setError(null)
    setNotice(null)
    try {
      await deleteTicketType(event.id, ticket.id)
      setConfirmingId(null)
      setNotice(`Ticket type “${ticket.name}” was deleted.`)
      onChanged()
    } catch (caught: unknown) {
      // For example: the ticket type is already used by bookings. The server explains.
      setError(userMessage(caught))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section aria-labelledby="ticket-types-heading" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ticket-types-heading" className="text-xl font-semibold text-slate-900">
          Ticket types
        </h2>
        {editable && !showForm && (
          <Button
            onClick={() => {
              setNotice(null)
              setError(null)
              setShowForm(true)
            }}
          >
            Add ticket type
          </Button>
        )}
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

      {showForm && (
        <div className="mt-4">
          <TicketTypeForm
            event={event}
            onCreated={(created) => {
              setShowForm(false)
              setNotice(`Ticket type “${created.name}” was added.`)
              onChanged()
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-4">
        {loadError && (
          <div className="space-y-3">
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" onClick={onChanged}>
              Try again
            </Button>
          </div>
        )}
        {!loadError && ticketTypes === null && <Spinner label="Loading ticket types…" />}
        {!loadError && ticketTypes !== null && ticketTypes.length === 0 && (
          <p className="text-sm text-slate-600">No ticket types yet. Customers can only book tickets once you add at least one.</p>
        )}
        {!loadError && ticketTypes !== null && ticketTypes.length > 0 && (
          <ul className="space-y-3">
            {ticketTypes.map((ticket) => (
              <li key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{ticket.name}</h3>
                    <p className="text-sm text-slate-700">
                      {ticket.price === 0 ? 'Free' : formatMoney(ticket.price, event.currency)}
                      {ticket.seatSection ? ` · Section ${ticket.seatSection}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {ticket.quantitySold} sold · {ticket.quantityRemaining ?? '–'} remaining of {ticket.quantityTotal}
                    </p>
                    <p className="text-xs text-slate-500">Up to {ticket.maxPerBooking} per booking</p>
                    <p className="text-xs text-slate-500">{salesWindow(ticket, event.venue.timeZone)}</p>
                  </div>

                  {editable &&
                    (confirmingId === ticket.id ? (
                      <div role="group" aria-label={`Confirm deleting ${ticket.name}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-900">Delete “{ticket.name}”? This cannot be undone.</p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="danger" loading={deletingId === ticket.id} disabled={deletingId !== null} onClick={() => remove(ticket)}>
                            Yes, delete
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirmingId(null)}>
                            Keep
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        aria-label={`Delete ${ticket.name}`}
                        onClick={() => {
                          setError(null)
                          setNotice(null)
                          setConfirmingId(ticket.id)
                        }}
                      >
                        Delete
                      </Button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}