export interface OrganizerTicketType {
  id: number
  name: string
  price: number
  quantityTotal: number
  quantitySold: number
  /** Can be null for reserved-seating types, whose availability comes from the seats. */
  quantityRemaining: number | null
  /** Set for reserved-seating types: the venue seat section this type sells. */
  seatSection: string | null
  maxPerBooking: number
  /** UTC instants, or null when there is no sales window. */
  salesStart: string | null
  salesEnd: string | null
}

/**
 * General admission sends quantityTotal; reserved seating sends seatSection instead.
 * Empty optional fields are left out of the request.
 */
export interface OrganizerTicketTypeInput {
  name: string
  price: number
  quantityTotal?: number
  seatSection?: string
  maxPerBooking?: number
  salesStart?: string
  salesEnd?: string
}

export interface SeatSection {
  section: string
  seatCount: number
  rowCount: number
}