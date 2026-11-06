import { useEffect, useState } from 'react'
import { getBooking } from '../api/bookings'
import type { Booking } from '../api/bookingTypes'
import { toApiError, userMessage } from '../api/errors'

interface Settled {
  key: string
  booking: Booking | null
  error: string | null
  notFound: boolean
}

/** Loads one of the current user's bookings. Pass null to skip loading (an id that is not a number). */
export function useBooking(id: string | null, reload: number) {
  const key = id === null ? null : `${id}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (id === null || key === null) {
      return
    }
    const controller = new AbortController()
    getBooking(Number(id), controller.signal)
      .then((booking) => setSettled({ key, booking, error: null, notFound: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        // Someone else's booking looks exactly like one that does not exist.
        const notFound = toApiError(error).status === 404
        setSettled({ key, booking: null, error: notFound ? null : userMessage(error), notFound })
      })
    return () => controller.abort()
  }, [id, key])

  const current = key !== null && settled?.key === key ? settled : null
  return {
    booking: current?.booking ?? null,
    error: current?.error ?? null,
    notFound: current?.notFound ?? false,
    loading: key !== null && current === null,
  }
}