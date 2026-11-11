import { describe, expect, it } from 'vitest'
import { buildUserSearch, EMPTY_USER_FILTERS, readUserFilters, toUsersParams } from './adminUserSearch'

describe('admin user search', () => {
  it('turns URL parameters into API parameters, with a 0-based page and a real boolean', () => {
    const params = toUsersParams(new URLSearchParams('q=ana&role=ORGANIZER&enabled=false&page=3'))

    expect(params).toEqual({ q: 'ana', role: 'ORGANIZER', enabled: false, page: 2, size: 20 })
  })

  it('uses defaults and ignores anything invalid in the URL', () => {
    const params = toUsersParams(new URLSearchParams('role=SUPERUSER&enabled=maybe&page=-2'))

    expect(params).toEqual({ page: 0, size: 20 })
    expect(readUserFilters(new URLSearchParams('q=%20%20'))).toEqual(EMPTY_USER_FILTERS)
  })

  it('writes short URLs: empty filters and page 1 are left out, and it reads back what it wrote', () => {
    expect(buildUserSearch(EMPTY_USER_FILTERS).toString()).toBe('')

    const search = buildUserSearch({ q: ' ana ', role: 'ADMIN', enabled: 'true' }, 2)

    expect(readUserFilters(search)).toEqual({ q: 'ana', role: 'ADMIN', enabled: 'true' })
    expect(search.get('page')).toBe('2')
  })
})