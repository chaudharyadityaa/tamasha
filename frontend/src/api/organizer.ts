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
import type { OrganizerTicketType, OrganizerTicketTypeInput, SeatSection } from './organizerInventoryTypes'
import type { PageResponse } from './types'

// ---------- events ----------

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

// The server decides whether each of these is allowed and explains a refusal in its error message.

export async function publishEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await http.post<OrganizerEvent>(`/api/organizer/events/${id}/publish`)
  return data
}

export async function unpublishEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await http.post<OrganizerEvent>(`/api/organizer/events/${id}/unpublish`)
  return data
}

/** Permanent: cancels every booking of the event, releases seats and tickets, refunds demo payments. */
export async function cancelEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await http.post<OrganizerEvent>(`/api/organizer/events/${id}/cancel`)
  return data
}

// ---------- ticket types ----------

export async function listTicketTypes(eventId: number, signal?: AbortSignal): Promise<OrganizerTicketType[]> {
  const { data } = await http.get<OrganizerTicketType[]>(`/api/organizer/events/${eventId}/ticket-types`, { signal })
  return data
}

export async function createTicketType(eventId: number, input: OrganizerTicketTypeInput): Promise<OrganizerTicketType> {
  const { data } = await http.post<OrganizerTicketType>(`/api/organizer/events/${eventId}/ticket-types`, input)
  return data
}

export async function deleteTicketType(eventId: number, ticketTypeId: number): Promise<void> {
  await http.delete(`/api/organizer/events/${eventId}/ticket-types/${ticketTypeId}`)
}

// ---------- venues ----------

export async function listVenues(params: VenuesParams, signal?: AbortSignal): Promise<PageResponse<Venue>> {
  const { data } = await http.get<PageResponse<Venue>>('/api/organizer/venues', { params, signal })
  return data
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const { data } = await http.post<Venue>('/api/organizer/venues', input)
  return data
}

export async function listSeatSections(venueId: number, signal?: AbortSignal): Promise<SeatSection[]> {
  const { data } = await http.get<SeatSection[]>(`/api/organizer/venues/${venueId}/seat-sections`, { signal })
  return data
}