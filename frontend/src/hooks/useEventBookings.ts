import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import { listEventBookings } from '../api/organizerOperations'
import type { OrganizerBooking } from '../api/organizerOperationsTypes'
import type { PageResponse } from '../api/types'

export const EVENT_BOOKINGS_PAGE_SIZE = 20

interface Settled {
  key: string
  data: PageResponse<OrganizerBooking> | null
  error: string | null
}

/** One page of an event's bookings. `page` starts at 1. The previous page stays visible while the next loads. */
export function useEventBookings(eventId: number, page: number, reload: number) {
  const key = `${eventId}#${page}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listEventBookings(eventId, { page: page - 1, size: EVENT_BOOKINGS_PAGE_SIZE }, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [eventId, page, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}