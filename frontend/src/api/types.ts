// These types mirror the JSON the backend returns.

export type Role = 'CUSTOMER' | 'ORGANIZER' | 'ADMIN'

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: User
}

export interface RegisterInput {
  email: string
  password: string
  fullName: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface EventSummary {
  id: number
  title: string
  category: string
  imageUrl: string | null
  startsAt: string
  endsAt: string
  venueName: string
  city: string
  timeZone: string
  startingPrice: number | null
  currency: string
}

export type EventSort = 'date' | 'date_desc' | 'price_asc' | 'price_desc' | 'newest'

export interface EventSearchParams {
  q?: string
  category?: string
  city?: string
  /** UTC instants such as 2026-12-01T00:00:00Z */
  from?: string
  to?: string
  minPrice?: number
  maxPrice?: number
  sort?: EventSort
  page?: number
  size?: number
}

export type SeatingMode = 'GENERAL_ADMISSION' | 'RESERVED_SEATING'

export interface VenueInfo {
  name: string
  addressLine: string
  city: string
  region: string | null
  country: string
  timeZone: string
}

export interface PublicTicketType {
  id: number
  name: string
  price: number
  /** Null for reserved-seating types (seat availability comes from the seat map). */
  quantityRemaining: number | null
  seatSection: string | null
  maxPerBooking: number
  salesStart: string | null
  salesEnd: string | null
  onSale: boolean
}

export interface EventDetail {
  id: number
  title: string
  description: string | null
  category: string
  imageUrl: string | null
  startsAt: string
  endsAt: string
  seatingMode: SeatingMode
  currency: string
  cancellationCutoffHours: number
  organizerName: string
  venue: VenueInfo
  ticketTypes: PublicTicketType[]
}

/** The error format the backend uses for every failure (RFC 9457 problem detail). */
export interface ProblemDetail {
  title?: string
  status?: number
  detail?: string
  /** Field name to message, present on validation errors. */
  errors?: Record<string, string>
}