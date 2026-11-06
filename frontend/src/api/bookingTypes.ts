export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'

export interface BookingItemLine {
  ticketTypeId: number
  ticketTypeName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface BookingSeatLine {
  seatId: number
  section: string
  row: string
  number: string
  ticketTypeName: string
  unitPrice: number
}

/** demo = true means no real money moved. */
export interface PaymentInfo {
  provider: string
  status: PaymentStatus
  demo: boolean
}

export interface Booking {
  id: number
  reference: string
  status: BookingStatus
  eventId: number
  eventTitle: string
  eventStartsAt: string
  currency: string
  totalAmount: number
  expiresAt: string
  createdAt: string
  items: BookingItemLine[]
  seats: BookingSeatLine[]
  payment: PaymentInfo | null
}

/**
 * Reserved-seating events send seatIds; general-admission events send items.
 * Note what is NOT here: prices, totals and the customer. The server decides those.
 */
export interface CreateBookingRequest {
  eventId: number
  seatIds?: number[]
  items?: { ticketTypeId: number; quantity: number }[]
}