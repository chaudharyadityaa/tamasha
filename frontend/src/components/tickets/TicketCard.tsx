import type { Ticket, TicketStatus } from '../../api/ticketTypes'
import { formatDateRange, formatDateTime, formatMoney } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { TicketQr } from './TicketQr'

const STATUS: Record<TicketStatus, { label: string; tone: 'success' | 'neutral' | 'danger' }> = {
  VALID: { label: 'Valid', tone: 'success' },
  CHECKED_IN: { label: 'Used', tone: 'neutral' },
  VOID: { label: 'Cancelled', tone: 'danger' },
}

function describeTicket(ticket: Ticket): string {
  return ticket.seat
    ? `${ticket.eventTitle}, ${ticket.seat.section} row ${ticket.seat.row} seat ${ticket.seat.number}`
    : `${ticket.eventTitle}, ${ticket.ticketTypeName}`
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const status = STATUS[ticket.status]
  const venue = ticket.venue
  const inactive = ticket.status !== 'VALID'

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className={inactive ? 'opacity-70' : undefined}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{ticket.eventTitle}</h2>
          <p className="mt-1 text-sm text-slate-700">{formatDateRange(ticket.eventStartsAt, ticket.eventEndsAt, venue.timeZone)}</p>
          <p className="text-xs text-slate-500">Times are in the venue's time zone ({venue.timeZone}).</p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Venue</dt>
              <dd className="text-slate-900">
                {venue.name}, {venue.addressLine}, {venue.city}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Ticket</dt>
              <dd className="text-slate-900">{ticket.ticketTypeName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Seat</dt>
              <dd className="font-medium text-slate-900">
                {ticket.seat
                  ? `${ticket.seat.section} · Row ${ticket.seat.row} · Seat ${ticket.seat.number}`
                  : 'General admission (no assigned seat)'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Price</dt>
              <dd className="text-slate-900">{ticket.price === 0 ? 'Free' : formatMoney(ticket.price, ticket.currency)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Booking</dt>
              <dd className="font-mono text-slate-900">{ticket.bookingReference}</dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-center">
          {ticket.qrAvailable ? (
            <>
              <TicketQr ticketId={ticket.id} description={describeTicket(ticket)} />
              <p className="mt-2 text-xs text-slate-600">Show this code at the entrance.</p>
              <p className="mt-1 break-all text-center font-mono text-xs text-slate-700">{ticket.code}</p>
              <p className="mt-1 max-w-56 text-center text-xs text-slate-500">
                Keep this code private: anyone who has it can use your ticket.
              </p>
            </>
          ) : (
            <div className="flex h-56 w-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600">
              {ticket.status === 'CHECKED_IN' ? (
                <>
                  <p className="font-semibold text-slate-800">Already used</p>
                  {ticket.checkedInAt && (
                    <p className="mt-1">Checked in {formatDateTime(ticket.checkedInAt, venue.timeZone)}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">Ticket cancelled</p>
                  <p className="mt-1">This ticket can no longer be used.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}