import type { OrganizerTicketType, SeatSection } from '../api/organizerInventoryTypes'
import type { OrganizerEvent, Venue } from '../api/organizerTypes'
import type { PageResponse } from '../api/types'

export function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 1,
    name: 'City Hall',
    addressLine: '1 Main Road',
    city: 'Agra',
    region: 'Uttar Pradesh',
    country: 'India',
    timeZone: 'Asia/Kolkata',
    capacity: 500,
    ...overrides,
  }
}

/** A draft event on 10 January 2027, 7:00 pm to 10:00 pm in Asia/Kolkata (13:30 to 16:30 UTC). */
export function makeOrganizerEvent(overrides: Partial<OrganizerEvent> = {}): OrganizerEvent {
  return {
    id: 7,
    venue: makeVenue(),
    title: 'Sitar Evening',
    description: 'An evening of classical music.',
    category: 'Music',
    imageUrl: null,
    startsAt: '2027-01-10T13:30:00Z',
    endsAt: '2027-01-10T16:30:00Z',
    seatingMode: 'GENERAL_ADMISSION',
    status: 'DRAFT',
    currency: 'INR',
    cancellationCutoffHours: 24,
    ...overrides,
  }
}

/** A general-admission ticket type with 12 of 50 sold and no sales window. */
export function makeTicketType(overrides: Partial<OrganizerTicketType> = {}): OrganizerTicketType {
  return {
    id: 1,
    name: 'Standing',
    price: 499.5,
    quantityTotal: 50,
    quantitySold: 12,
    quantityRemaining: 38,
    seatSection: null,
    maxPerBooking: 4,
    salesStart: null,
    salesEnd: null,
    ...overrides,
  }
}

export function makeSeatSection(overrides: Partial<SeatSection> = {}): SeatSection {
  return { section: 'VIP', seatCount: 30, rowCount: 3, ...overrides }
}

export function pageOf<T>(content: T[], totalElements = content.length, totalPages = 1, page = 0): PageResponse<T> {
  return { content, page, size: 10, totalElements, totalPages }
}