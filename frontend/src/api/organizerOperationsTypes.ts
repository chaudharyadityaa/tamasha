import type { BookingStatus } from './bookingTypes'
import type { TicketStatus } from './ticketTypes'

// ---------- seat blocks ----------

export interface SeatBlockInput {
  section: string
  rows: string[]
  seatsPerRow: number
}

export interface SeatBlockResult {
  section: string
  rows: string[]
  seatsPerRow: number
  seatsCreated: number
}

// ---------- sales ----------

export interface OverallStats {
  capacity: number
  confirmed: number
  held: number
  available: number
  /** 0 to 100. */
  occupancyPercent: number
}

export interface TicketTypeStats {
  ticketTypeId: number
  name: string
  price: number
  seatSection: string | null
  capacity: number
  confirmed: number
  held: number
  available: number
}

export interface EventStats {
  eventId: number
  eventTitle: string
  currency: string
  confirmedRevenue: number
  /** Booking status name to number of bookings, for example { CONFIRMED: 4 }. */
  bookingsByStatus: Record<string, number>
  overall: OverallStats
  ticketTypes: TicketTypeStats[]
}

export interface OrganizerBooking {
  id: number
  reference: string
  status: BookingStatus
  customerName: string
  currency: string
  totalAmount: number
  createdAt: string
  expiresAt: string
}

// ---------- check-in ----------

export interface CheckInSeat {
  section: string
  row: string
  number: string
}

export interface CheckInResult {
  ticketId: number
  status: TicketStatus
  holderName: string
  ticketTypeName: string
  /** Null for general admission. */
  seat: CheckInSeat | null
  checkedInAt: string | null
}

export interface Attendance {
  total: number
  checkedIn: number
  notYetArrived: number
  voided: number
}