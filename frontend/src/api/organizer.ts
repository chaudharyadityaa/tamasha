import { http } from './client'
import type {
  CreateEventInput,
  OrganizerEvent,
  OrganizerEventsParams,
  UpdateEventInput,
  Venue,
  VenueInput,
  VenuesParams,
} from './organizerTypes'
import type { PageResponse } from './types'

export async function listOrganizerEvents(
  params: OrganizerEventsParams,
  signal?: AbortSignal,
): Promise<PageResponse<OrganizerEvent>> {
  const { data } = await http.get<PageResponse<OrganizerEvent>>('/api/organizer/events', { params, signal })
  return data
}

export async function getOrganizerEvent(id: number, signal?: AbortSignal): Promise<OrganizerEvent> {
  const { data } = await http.get<OrganizerEvent>(`/api/organizer/events/${id}`, { signal })
  return data
}

export async function createEvent(input: CreateEventInput): Promise<OrganizerEvent> {
  const { data } = await http.post<OrganizerEvent>('/api/organizer/events', input)
  return data
}

export async function updateEvent(id: number, input: UpdateEventInput): Promise<OrganizerEvent> {
  const { data } = await http.put<OrganizerEvent>(`/api/organizer/events/${id}`, input)
  return data
}

export async function listVenues(params: VenuesParams, signal?: AbortSignal): Promise<PageResponse<Venue>> {
  const { data } = await http.get<PageResponse<Venue>>('/api/organizer/venues', { params, signal })
  return data
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const { data } = await http.post<Venue>('/api/organizer/venues', input)
  return data
}