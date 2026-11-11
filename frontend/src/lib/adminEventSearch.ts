import type { AdminEventsParams } from '../api/adminTypes'
import type { EventStatus } from '../api/organizerTypes'
import { readPage } from './eventSearch'
import { readPositiveInteger, readText } from './queryParams'

export const ADMIN_EVENTS_PAGE_SIZE = 20

const STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'CANCELLED']

/** The values of the filter form. `organizerId` is "" or a whole number as text. */
export interface AdminEventFilters {
  q: string
  status: EventStatus | ''
  organizerId: string
}

export const EMPTY_ADMIN_EVENT_FILTERS: AdminEventFilters = { q: '', status: '', organizerId: '' }

export function readAdminEventFilters(search: URLSearchParams): AdminEventFilters {
  const status = search.get('status')
  return {
    q: readText(search, 'q'),
    status: STATUSES.find((candidate) => candidate === status) ?? '',
    organizerId: readPositiveInteger(search, 'organizerId'),
  }
}

/** Builds the URL query. Empty filters and page 1 are left out to keep URLs short. */
export function buildAdminEventSearch(filters: AdminEventFilters, page = 1): URLSearchParams {
  const search = new URLSearchParams()
  if (filters.q.trim()) {
    search.set('q', filters.q.trim())
  }
  if (filters.status) {
    search.set('status', filters.status)
  }
  if (filters.organizerId.trim()) {
    search.set('organizerId', filters.organizerId.trim())
  }
  if (page > 1) {
    search.set('page', String(page))
  }
  return search
}

export function toAdminEventsParams(search: URLSearchParams): AdminEventsParams {
  const filters = readAdminEventFilters(search)
  const params: AdminEventsParams = { page: readPage(search) - 1, size: ADMIN_EVENTS_PAGE_SIZE }
  if (filters.q) {
    params.q = filters.q
  }
  if (filters.status) {
    params.status = filters.status
  }
  if (filters.organizerId) {
    params.organizerId = Number(filters.organizerId)
  }
  return params
}