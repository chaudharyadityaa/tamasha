import type { Attendance, CheckInResult, EventStats, OrganizerBooking } from '../api/organizerOperationsTypes'

/** 4 of 50 sold, 2 held, 8% occupancy, 1998.00 revenue. */
export function makeStats(overrides: Partial<EventStats> = {}): EventStats {
  return {
    eventId: 7,
    eventTitle: 'Sitar Evening',
    currency: 'INR',
    confirmedRevenue: 1998,
    bookingsByStatus: { CANCELLED: 1, CONFIRMED: 2, PENDING_PAYMENT: 1 },
    overall: { capacity: 50, confirmed: 4, held: 2, available: 44, occupancyPercent: 8 },
    ticketTypes: [
      { ticketTypeId: 1, name: 'Standing', price: 499.5, seatSection: null, capacity: 50, confirmed: 4, held: 2, available: 44 },
    ],
    ...overrides,
  }
}

export function makeBookingRow(overrides: Partial<OrganizerBooking> = {}): OrganizerBooking {
  return {
    id: 31,
    reference: 'EH-ROW0000001',
    status: 'CONFIRMED',
    customerName: 'Ana Rao',
    currency: 'INR',
    totalAmount: 999,
    createdAt: '2026-12-01T10:00:00Z',
    expiresAt: '2026-12-01T10:15:00Z',
    ...overrides,
  }
}

/** 3 of 10 checked in, 6 not yet arrived, 1 cancelled ticket. */
export function makeAttendance(overrides: Partial<Attendance> = {}): Attendance {
  return { total: 10, checkedIn: 3, notYetArrived: 6, voided: 1, ...overrides }
}

export function makeCheckInResult(overrides: Partial<CheckInResult> = {}): CheckInResult {
  return {
    ticketId: 301,
    status: 'CHECKED_IN',
    holderName: 'Ana Rao',
    ticketTypeName: 'VIP',
    seat: { section: 'VIP', row: 'A', number: '3' },
    checkedInAt: '2027-01-10T13:40:00Z',
    ...overrides,
  }
}