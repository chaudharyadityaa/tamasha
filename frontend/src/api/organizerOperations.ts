import { http } from './client'
import type { Venue } from './organizerTypes'
import type {
  Attendance,
  CheckInResult,
  EventStats,
  OrganizerBooking,
  SeatBlockInput,
  SeatBlockResult,
} from './organizerOperationsTypes'
import type { PageResponse } from './types'

export async function getVenue(id: number, signal?: AbortSignal): Promise<Venue> {
  const { data } = await http.get<Venue>(`/api/organizer/venues/${id}`, { signal })
  return data
}

/** Adds one block of seats (rows x seats per row) to a venue section. The server enforces venue limits. */
export async function createSeatBlock(venueId: number, input: SeatBlockInput): Promise<SeatBlockResult> {
  const { data } = await http.post<SeatBlockResult>(`/api/organizer/venues/${venueId}/seat-blocks`, input)
  return data
}

export async function deleteSeatSection(venueId: number, section: string): Promise<void> {
  await http.delete(`/api/organizer/venues/${venueId}/seat-sections/${encodeURIComponent(section)}`)
}

export async function getEventStats(eventId: number, signal?: AbortSignal): Promise<EventStats> {
  const { data } = await http.get<EventStats>(`/api/organizer/events/${eventId}/stats`, { signal })
  return data
}

export async function listEventBookings(
  eventId: number,
  params: { page: number; size: number },
  signal?: AbortSignal,
): Promise<PageResponse<OrganizerBooking>> {
  const { data } = await http.get<PageResponse<OrganizerBooking>>(`/api/organizer/events/${eventId}/bookings`, {
    params,
    signal,
  })
  return data
}

/** Admits the holder of a ticket. The server refuses used, cancelled or unknown tickets and explains why. */
export async function checkInTicket(eventId: number, code: string): Promise<CheckInResult> {
  const { data } = await http.post<CheckInResult>(`/api/organizer/events/${eventId}/check-ins`, { code })
  return data
}

export async function getAttendance(eventId: number, signal?: AbortSignal): Promise<Attendance> {
  const { data } = await http.get<Attendance>(`/api/organizer/events/${eventId}/attendance`, { signal })
  return data
}