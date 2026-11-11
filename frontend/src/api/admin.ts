import { http } from './client'
import type {
  AdminBookingRow,
  AdminBookingsParams,
  AdminDashboard,
  AdminEvent,
  AdminEventsParams,
  AdminUser,
  UsersParams,
} from './adminTypes'
import type { Booking } from './bookingTypes'
import type { PageResponse, Role } from './types'

export async function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboard> {
  const { data } = await http.get<AdminDashboard>('/api/admin/dashboard', { signal })
  return data
}

// ---------- users ----------

export async function listUsers(params: UsersParams, signal?: AbortSignal): Promise<PageResponse<AdminUser>> {
  const { data } = await http.get<PageResponse<AdminUser>>('/api/admin/users', { params, signal })
  return data
}

/** The server refuses to change the caller's own account and explains why. */
export async function setUserEnabled(id: number, enabled: boolean): Promise<AdminUser> {
  const { data } = await http.put<AdminUser>(`/api/admin/users/${id}/enabled`, { enabled })
  return data
}

export async function setUserRole(id: number, role: Role): Promise<AdminUser> {
  const { data } = await http.put<AdminUser>(`/api/admin/users/${id}/role`, { role })
  return data
}

// ---------- events ----------

export async function listAdminEvents(params: AdminEventsParams, signal?: AbortSignal): Promise<PageResponse<AdminEvent>> {
  const { data } = await http.get<PageResponse<AdminEvent>>('/api/admin/events', { params, signal })
  return data
}

/** Permanent: cancels every booking of the event, releases seats and tickets, refunds demo payments. */
export async function cancelAdminEvent(id: number): Promise<AdminEvent> {
  const { data } = await http.post<AdminEvent>(`/api/admin/events/${id}/cancel`)
  return data
}

// ---------- bookings ----------

export async function listAdminBookings(
  params: AdminBookingsParams,
  signal?: AbortSignal,
): Promise<PageResponse<AdminBookingRow>> {
  const { data } = await http.get<PageResponse<AdminBookingRow>>('/api/admin/bookings', { params, signal })
  return data
}

export async function getAdminBooking(id: number, signal?: AbortSignal): Promise<Booking> {
  const { data } = await http.get<Booking>(`/api/admin/bookings/${id}`, { signal })
  return data
}

export async function cancelAdminBooking(id: number): Promise<Booking> {
  const { data } = await http.post<Booking>(`/api/admin/bookings/${id}/cancel`)
  return data
}