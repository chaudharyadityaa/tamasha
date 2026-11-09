import type { BookingSummary } from '../api/bookingTypes'
import type { Ticket } from '../api/ticketTypes'

/** A valid reserved-seating ticket. Override fields to make used or cancelled ones. */
export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 301,
    code: 'TK-4M7Q0XB92HZ5N3C8DKWA',
    status: 'VALID',
    qrAvailable: true,
    bookingReference: 'EH-ABCDEFGHJK',
    eventId: 7,
    eventTitle: 'Symphony Night',
    eventStartsAt: '2027-01-10T13:30:00Z',
    eventEndsAt: '2027-01-10T16:30:00Z',
    venue: { name: 'City Hall', addressLine: '1 Main Road', city: 'Agra', timeZone: 'Asia/Kolkata' },
    ticketTypeName: 'VIP',
    price: 2500,
    currency: 'INR',
    seat: { section: 'VIP', row: 'A', number: '3' },
    checkedInAt: null,
    ...overrides,
  }
}

export function makeSummary(overrides: Partial<BookingSummary> = {}): BookingSummary {
  return {
    id: 9,
    reference: 'EH-SUMMARY001',
    status: 'CONFIRMED',
    eventId: 7,
    eventTitle: 'Symphony Night',
    eventStartsAt: '2027-01-10T13:30:00Z',
    eventEndsAt: '2027-01-10T16:30:00Z',
    currency: 'INR',
    totalAmount: 5000,
    expiresAt: '2026-12-01T10:15:00Z',
    createdAt: '2026-12-01T10:00:00Z',
    ...overrides,
  }
}