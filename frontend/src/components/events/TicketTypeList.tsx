import type { ReactNode } from 'react'
import type { PublicTicketType } from '../../api/types'
import { formatDateTime, formatMoney } from '../../lib/format'
import { Badge } from '../ui/Badge'

interface TicketTypeListProps {
  ticketTypes: PublicTicketType[]
  currency: string
  timeZone: string
  /** Optional extra content under each ticket type, such as a quantity stepper. */
  renderAction?: (ticket: PublicTicketType) => ReactNode
}

function availability(ticket: PublicTicketType): { label: string; tone: 'success' | 'warning' | 'danger' | 'info' } {
  if (ticket.quantityRemaining === null) {
    return { label: 'Choose your seats', tone: 'info' }
  }
  if (ticket.quantityRemaining === 0) {
    return { label: 'Sold out', tone: 'danger' }
  }
  if (ticket.quantityRemaining <= 10) {
    return { label: `Only ${ticket.quantityRemaining} left`, tone: 'warning' }
  }
  return { label: `${ticket.quantityRemaining} available`, tone: 'success' }
}

function salesStatus(ticket: PublicTicketType, timeZone: string): string | null {
  if (ticket.onSale) {
    return null
  }
  if (ticket.salesStart && new Date(ticket.salesStart).getTime() > Date.now()) {
    return `Sales open ${formatDateTime(ticket.salesStart, timeZone)}`
  }
  return 'Sales closed'
}

export function TicketTypeList({ ticketTypes, currency, timeZone, renderAction }: TicketTypeListProps) {
  if (ticketTypes.length === 0) {
    return <p className="text-sm text-slate-500">No tickets are available for this event.</p>
  }
  return (
    <ul className="space-y-3">
      {ticketTypes.map((ticket) => {
        const stock = availability(ticket)
        const status = salesStatus(ticket, timeZone)
        return (
          <li key={ticket.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{ticket.name}</p>
                {ticket.seatSection && <p className="text-xs text-slate-500">Section: {ticket.seatSection}</p>}
              </div>
              <p className="whitespace-nowrap font-semibold text-slate-900">
                {ticket.price === 0 ? 'Free' : formatMoney(ticket.price, currency)}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={stock.tone}>{stock.label}</Badge>
              <span className="text-xs text-slate-500">Up to {ticket.maxPerBooking} per booking</span>
            </div>
            {status && <p className="mt-2 text-xs font-medium text-amber-700">{status}</p>}
            {renderAction?.(ticket)}
          </li>
        )
      })}
    </ul>
  )
}