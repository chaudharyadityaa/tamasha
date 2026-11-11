import type { UsersParams } from '../api/adminTypes'
import type { Role } from '../api/types'
import { readPage } from './eventSearch'
import { ROLES } from './roleLabels'

export const USERS_PAGE_SIZE = 20

/** The values of the users filter form. `enabled` is "" (all), "true" (active) or "false" (disabled). */
export interface UserFilters {
  q: string
  role: Role | ''
  enabled: '' | 'true' | 'false'
}

export const EMPTY_USER_FILTERS: UserFilters = { q: '', role: '', enabled: '' }

/** Reads the filters from the URL, ignoring anything invalid. */
export function readUserFilters(search: URLSearchParams): UserFilters {
  const role = search.get('role')
  const enabled = search.get('enabled')
  return {
    q: (search.get('q') ?? '').trim().slice(0, 100),
    role: ROLES.find((candidate) => candidate === role) ?? '',
    enabled: enabled === 'true' || enabled === 'false' ? enabled : '',
  }
}

/** Builds the URL query. Empty filters and page 1 are left out to keep URLs short. */
export function buildUserSearch(filters: UserFilters, page = 1): URLSearchParams {
  const search = new URLSearchParams()
  if (filters.q.trim()) {
    search.set('q', filters.q.trim())
  }
  if (filters.role) {
    search.set('role', filters.role)
  }
  if (filters.enabled) {
    search.set('enabled', filters.enabled)
  }
  if (page > 1) {
    search.set('page', String(page))
  }
  return search
}

/** Turns the URL into the parameters for GET /api/admin/users. */
export function toUsersParams(search: URLSearchParams): UsersParams {
  const filters = readUserFilters(search)
  const params: UsersParams = { page: readPage(search) - 1, size: USERS_PAGE_SIZE }
  if (filters.q) {
    params.q = filters.q
  }
  if (filters.role) {
    params.role = filters.role
  }
  if (filters.enabled) {
    params.enabled = filters.enabled === 'true'
  }
  return params
}