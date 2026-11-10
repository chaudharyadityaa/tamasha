import type { SeatingMode } from './types'

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'

export interface Venue {
  id: number
  name: string
  addressLine: string
  city: string
  region: string | null
  country: string
  /** IANA name such as Asia/Kolkata. Event times are shown in this zone. */
  timeZone: string
  capacity: number
}

export interface VenueInput {
  name: string
  addressLine: string
  city: string
  region?: string
  country: string
  timeZone: string
  capacity: number
}

export interface OrganizerEvent {
  id: number
  venue: Venue
  title: string
  description: string | null
  category: string
  imageUrl: string | null
  /** UTC instants. */
  startsAt: string
  endsAt: string
  seatingMode: SeatingMode
  status: EventStatus
  currency: string
  cancellationCutoffHours: number
}

export interface CreateEventInput {
  venueId: number
  title: string
  description?: string
  category: string
  imageUrl?: string
  startsAt: string
  endsAt: string
  seatingMode: SeatingMode
  currency?: string
  cancellationCutoffHours?: number
}

/** The venue and the seating mode cannot be changed after an event is created. */
export interface UpdateEventInput {
  title: string
  description?: string
  category: string
  imageUrl?: string
  startsAt: string
  endsAt: string
  cancellationCutoffHours?: number
}

export interface OrganizerEventsParams {
  status?: EventStatus
  /** 0-based, as the API expects. */
  page: number
  size: number
}

export interface VenuesParams {
  page: number
  size: number
}