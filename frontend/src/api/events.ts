import { http } from './client'
import type { EventSearchParams, EventSummary, PageResponse } from './types'

export async function searchEvents(
  params: EventSearchParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<EventSummary>> {
  const { data } = await http.get<PageResponse<EventSummary>>('/api/events', { params, signal })
  return data
}