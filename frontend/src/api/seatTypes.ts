export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED'

export interface SeatView {
  id: number
  row: string
  number: string
  status: SeatStatus
}

/** One ticket section of the venue (for example "VIP") with its price and every seat in it. */
export interface SeatMapSection {
  ticketTypeId: number
  name: string
  section: string
  price: number
  onSale: boolean
  seats: SeatView[]
}

export interface SeatMap {
  eventId: number
  currency: string
  sections: SeatMapSection[]
}