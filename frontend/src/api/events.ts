import { http } from './client'
import type { EventDetail, EventSearchParams, EventSummary, PageResponse } from './types'

export async function searchEvents(
  params: EventSearchParams = {},
  signal?: AbortSignal,
): Promise<PageResponse<EventSummary>> {
  const { data } = await http.get<PageResponse<EventSummary>>('/api/events', { params, signal })
  return data
}

export async function getEvent(id: number, signal?: AbortSignal): Promise<EventDetail> {
  const { data } = await http.get<EventDetail>(`/api/events/${id}`, { signal })
  return data
}