import type { EventStatus } from '../api/organizerTypes'
import type { SeatingMode } from '../api/types'

export const EVENT_STATUS: Record<EventStatus, { label: string; tone: 'neutral' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  PUBLISHED: { label: 'Published', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
}

export const SEATING_LABEL: Record<SeatingMode, string> = {
  GENERAL_ADMISSION: 'General admission',
  RESERVED_SEATING: 'Reserved seating',
}