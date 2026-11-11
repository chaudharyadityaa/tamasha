import { describe, expect, it } from 'vitest'
import {
  buildAdminBookingSearch,
  EMPTY_ADMIN_BOOKING_FILTERS,
  readAdminBookingFilters,
  toAdminBookingsParams,
} from './adminBookingSearch'

describe('admin booking search', () => {
  it('turns URL parameters into API parameters, with a 0-based page and a numeric event id', () => {
    const params = toAdminBookingsParams(new URLSearchParams('q=ana&status=PENDING_PAYMENT&eventId=21&page=2'))

    expect(params).toEqual({ q: 'ana', status: 'PENDING_PAYMENT', eventId: 21, page: 1, size: 20 })
  })

  it('uses defaults and ignores anything invalid in the URL', () => {
    const params = toAdminBookingsParams(new URLSearchParams('status=NOPE&eventId=1.5'))

    expect(params).toEqual({ page: 0, size: 20 })
    expect(readAdminBookingFilters(new URLSearchParams(''))).toEqual(EMPTY_ADMIN_BOOKING_FILTERS)
  })

  it('writes short URLs and reads back what it wrote', () => {
    expect(buildAdminBookingSearch(EMPTY_ADMIN_BOOKING_FILTERS).toString()).toBe('')

    const search = buildAdminBookingSearch({ q: 'EH-1', status: 'EXPIRED', eventId: '9' }, 3)

    expect(readAdminBookingFilters(search)).toEqual({ q: 'EH-1', status: 'EXPIRED', eventId: '9' })
    expect(search.get('page')).toBe('3')
  })
})