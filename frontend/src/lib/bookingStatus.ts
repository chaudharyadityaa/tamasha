import type { BookingStatus } from '../api/bookingTypes'

export type StatusTone = 'warning' | 'success' | 'neutral' | 'danger'

/** One place that decides how a booking status is worded and colored everywhere in the app. */
export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
}