import { vi } from 'vitest'
import type { Booking } from '../api/bookingTypes'
import type { EventDetail, User } from '../api/types'
import type { AuthContextValue } from '../auth/authContext'

export const customer: User = { id: 1, email: 'ana@example.com', fullName: 'Ana', role: 'CUSTOMER' }

export function authContext(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    sessionExpired: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearSessionExpired: vi.fn(),
    ...overrides,
  }
}

export function loggedIn(): AuthContextValue {
  return authContext({ status: 'authenticated', user: customer })
}

const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

/** A general-admission event with four kinds of ticket: bookable, limited, sold out and not yet on sale. */
export function makeEvent(overrides: Partial<EventDetail> = {}): EventDetail {
  return {
    id: 7,
    title: 'Sitar Evening',
    description: 'An evening of classical music.',
    category: 'MUSIC',
    imageUrl: null,
    startsAt: '2027-01-10T13:30:00Z',
    endsAt: '2027-01-10T16:30:00Z',
    seatingMode: 'GENERAL_ADMISSION',
    currency: 'INR',
    cancellationCutoffHours: 24,
    organizerName: 'Asha Events',
    venue: { name: 'City Hall', addressLine: '1 Main Road', city: 'Agra', region: null, country: 'India', timeZone: 'Asia/Kolkata' },
    ticketTypes: [
      { id: 1, name: 'Standing', price: 499.5, quantityRemaining: 20, seatSection: null, maxPerBooking: 4, salesStart: null, salesEnd: null, onSale: true },
      { id: 2, name: 'VIP', price: 1500, quantityRemaining: 3, seatSection: null, maxPerBooking: 2, salesStart: null, salesEnd: null, onSale: true },
      { id: 3, name: 'Sold out', price: 200, quantityRemaining: 0, seatSection: null, maxPerBooking: 4, salesStart: null, salesEnd: null, onSale: true },
      { id: 4, name: 'Early bird', price: 300, quantityRemaining: 40, seatSection: null, maxPerBooking: 4, salesStart: inFiveDays, salesEnd: null, onSale: false },
    ],
    ...overrides,
  }
}

/** An unpaid booking with ten minutes left on its hold. */
export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 55,
    reference: 'EH-ABCDEFGHJK',
    status: 'PENDING_PAYMENT',
    eventId: 7,
    eventTitle: 'Sitar Evening',
    eventStartsAt: '2027-01-10T13:30:00Z',
    currency: 'INR',
    totalAmount: 999,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    items: [{ ticketTypeId: 1, ticketTypeName: 'Standing', quantity: 2, unitPrice: 499.5, lineTotal: 999 }],
    seats: [],
    payment: null,
    ...overrides,
  }
}