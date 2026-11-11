import { describe, expect, it } from 'vitest'
import { buildAdminEventSearch, EMPTY_ADMIN_EVENT_FILTERS, readAdminEventFilters, toAdminEventsParams } from './adminEventSearch'

describe('admin event search', () => {
  it('turns URL parameters into API parameters, with a 0-based page and a numeric organizer id', () => {
    const params = toAdminEventsParams(new URLSearchParams('q=sitar&status=PUBLISHED&organizerId=5&page=3'))

    expect(params).toEqual({ q: 'sitar', status: 'PUBLISHED', organizerId: 5, page: 2, size: 20 })
  })

  it('uses defaults and ignores anything invalid in the URL', () => {
    const params = toAdminEventsParams(new URLSearchParams('status=HACKED&organizerId=abc&page=0'))

    expect(params).toEqual({ page: 0, size: 20 })
    expect(readAdminEventFilters(new URLSearchParams('organizerId=-4&q=%20'))).toEqual(EMPTY_ADMIN_EVENT_FILTERS)
  })

  it('writes short URLs and reads back what it wrote', () => {
    expect(buildAdminEventSearch(EMPTY_ADMIN_EVENT_FILTERS).toString()).toBe('')

    const search = buildAdminEventSearch({ q: ' sitar ', status: 'CANCELLED', organizerId: '7' }, 2)

    expect(readAdminEventFilters(search)).toEqual({ q: 'sitar', status: 'CANCELLED', organizerId: '7' })
    expect(search.get('page')).toBe('2')
  })
})