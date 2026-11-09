import { useEffect, useState } from 'react'
import { listMyBookings } from '../api/bookings'
import type { BookingBucket, BookingSummary } from '../api/bookingTypes'
import { userMessage } from '../api/errors'
import type { PageResponse } from '../api/types'

export const MY_BOOKINGS_PAGE_SIZE = 10

interface Settled {
  key: string
  data: PageResponse<BookingSummary> | null
  error: string | null
}

/** Loads one page of my bookings. The previous page stays visible while the next one loads. */
export function useMyBookings(bucket: BookingBucket, page: number, reload: number) {
  const key = `${bucket}#${page}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listMyBookings({ bucket, page: page - 1, size: MY_BOOKINGS_PAGE_SIZE }, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [bucket, page, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}