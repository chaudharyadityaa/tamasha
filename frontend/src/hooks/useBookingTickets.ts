import { useEffect, useState } from 'react'
import { toApiError, userMessage } from '../api/errors'
import { getBookingTickets } from '../api/tickets'
import type { Ticket } from '../api/ticketTypes'

interface Settled {
  key: string
  tickets: Ticket[] | null
  error: string | null
  notFound: boolean
}

/** Loads the tickets of one of my bookings. Pass null to skip loading (an id that is not a number). */
export function useBookingTickets(id: string | null, reload: number) {
  const key = id === null ? null : `${id}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (id === null || key === null) {
      return
    }
    const controller = new AbortController()
    getBookingTickets(Number(id), controller.signal)
      .then((tickets) => setSettled({ key, tickets, error: null, notFound: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        // Someone else's booking looks exactly like one that does not exist.
        const notFound = toApiError(error).status === 404
        setSettled({ key, tickets: null, error: notFound ? null : userMessage(error), notFound })
      })
    return () => controller.abort()
  }, [id, key])

  const current = key !== null && settled?.key === key ? settled : null
  return {
    tickets: current?.tickets ?? null,
    error: current?.error ?? null,
    notFound: current?.notFound ?? false,
    loading: key !== null && current === null,
  }
}