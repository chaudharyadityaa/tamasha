import { http } from './client'
import type { SeatMap } from './seatTypes'

export async function getSeatMap(eventId: number, signal?: AbortSignal): Promise<SeatMap> {
  const { data } = await http.get<SeatMap>(`/api/events/${eventId}/seats`, { signal })
  return data
}