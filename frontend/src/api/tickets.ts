import { http } from './client'
import type { Ticket } from './ticketTypes'

/** The tickets of one of my bookings. Empty until the booking is paid. */
export async function getBookingTickets(bookingId: number, signal?: AbortSignal): Promise<Ticket[]> {
  const { data } = await http.get<Ticket[]>(`/api/bookings/${bookingId}/tickets`, { signal })
  return data
}

export async function getTicket(ticketId: number, signal?: AbortSignal): Promise<Ticket> {
  const { data } = await http.get<Ticket>(`/api/tickets/${ticketId}`, { signal })
  return data
}

/**
 * The QR code image. It needs the login token, which a plain <img src> cannot send, so we download it as a
 * binary blob and the page shows it from a temporary in-browser URL.
 */
export async function getTicketQr(ticketId: number, signal?: AbortSignal): Promise<Blob> {
  const { data } = await http.get<Blob>(`/api/tickets/${ticketId}/qr.png`, { responseType: 'blob', signal })
  return data
}