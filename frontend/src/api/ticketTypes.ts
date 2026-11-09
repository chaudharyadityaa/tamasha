export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'VOID'

export interface TicketVenue {
  name: string
  addressLine: string
  city: string
  timeZone: string
}

/** Present on reserved-seating tickets; null for general admission. */
export interface TicketSeat {
  section: string
  row: string
  number: string
}

export interface Ticket {
  id: number
  /** The text inside the QR code. Anyone who holds it can use the ticket, so it is shown with a warning. */
  code: string
  status: TicketStatus
  /** True only for tickets that can still be used. */
  qrAvailable: boolean
  bookingReference: string
  eventId: number
  eventTitle: string
  eventStartsAt: string
  eventEndsAt: string
  venue: TicketVenue
  ticketTypeName: string
  price: number
  currency: string
  seat: TicketSeat | null
  checkedInAt: string | null
}