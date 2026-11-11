import type { AdminBookingsParams } from '../api/adminTypes'
import type { BookingStatus } from '../api/bookingTypes'
import { readPage } from './eventSearch'
import { readPositiveInteger, readText } from './queryParams'

export const ADMIN_BOOKINGS_PAGE_SIZE = 20

const STATUSES: BookingStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED']

/** The values of the filter form. `eventId` is "" or a whole number as text. */
export interface AdminBookingFilters {
  q: string
  status: BookingStatus | ''
  eventId: string
}

export const EMPTY_ADMIN_BOOKING_FILTERS: AdminBookingFilters = { q: '', status: '', eventId: '' }

export function readAdminBookingFilters(search: URLSearchParams): AdminBookingFilters {
  const status = search.get('status')
  return {
    q: readText(search, 'q'),
    status: STATUSES.find((candidate) => candidate === status) ?? '',
    eventId: readPositiveInteger(search, 'eventId'),
  }
}

/** Builds the URL query. Empty filters and page 1 are left out to keep URLs short. */
export function buildAdminBookingSearch(filters: AdminBookingFilters, page = 1): URLSearchParams {
  const search = new URLSearchParams()
  if (filters.q.trim()) {
    search.set('q', filters.q.trim())
  }
  if (filters.status) {
    search.set('status', filters.status)
  }
  if (filters.eventId.trim()) {
    search.set('eventId', filters.eventId.trim())
  }
  if (page > 1) {
    search.set('page', String(page))
  }
  return search
}

export function toAdminBookingsParams(search: URLSearchParams): AdminBookingsParams {
  const filters = readAdminBookingFilters(search)
  const params: AdminBookingsParams = { page: readPage(search) - 1, size: ADMIN_BOOKINGS_PAGE_SIZE }
  if (filters.q) {
    params.q = filters.q
  }
  if (filters.status) {
    params.status = filters.status
  }
  if (filters.eventId) {
    params.eventId = Number(filters.eventId)
  }
  return params
}