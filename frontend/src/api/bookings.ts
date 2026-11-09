import { http } from './client'
import type { Booking, BookingSummary, CreateBookingRequest, MyBookingsParams } from './bookingTypes'
import type { PageResponse } from './types'

/** The same Idempotency-Key always gives back the same booking, so a retry never books twice. */
export async function createBooking(request: CreateBookingRequest, idempotencyKey: string): Promise<Booking> {
  const { data } = await http.post<Booking>('/api/bookings', request, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function listMyBookings(
  params: MyBookingsParams,
  signal?: AbortSignal,
): Promise<PageResponse<BookingSummary>> {
  const { data } = await http.get<PageResponse<BookingSummary>>('/api/bookings/my', { params, signal })
  return data
}

export async function getBooking(id: number, signal?: AbortSignal): Promise<Booking> {
  const { data } = await http.get<Booking>(`/api/bookings/${id}`, { signal })
  return data
}

export async function cancelBooking(id: number): Promise<Booking> {
  const { data } = await http.post<Booking>(`/api/bookings/${id}/cancel`)
  return data
}

/** DEMO payment: only exists on servers that enable it, and no real money moves. */
export async function payWithDemo(id: number): Promise<Booking> {
  const { data } = await http.post<Booking>(`/api/bookings/${id}/demo-payment`)
  return data
}