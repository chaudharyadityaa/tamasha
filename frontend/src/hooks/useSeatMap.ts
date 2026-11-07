import { useEffect, useState } from 'react'
import { toApiError, userMessage } from '../api/errors'
import { getSeatMap } from '../api/seats'
import type { SeatMap } from '../api/seatTypes'

type Outcome = 'ok' | 'not-found' | 'not-reserved' | 'error'

interface Settled {
  key: string
  error: string | null
  outcome: Outcome
}

/**
 * Loads the seat map. The last good map stays available while a refresh is running (or if a refresh fails),
 * so the page never flashes empty. Outdated requests are cancelled.
 */
export function useSeatMap(id: string, reload: number) {
  const key = `${id}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getSeatMap(Number(id), controller.signal)
      .then((map) => {
        setSeatMap(map)
        setSettled({ key, error: null, outcome: 'ok' })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        const status = toApiError(error).status
        // 404: unknown, draft or cancelled event. 400: the event has no reserved seating.
        const outcome: Outcome = status === 404 ? 'not-found' : status === 400 ? 'not-reserved' : 'error'
        setSettled({ key, error: outcome === 'error' ? userMessage(error) : null, outcome })
      })
    return () => controller.abort()
  }, [id, key])

  const current = settled?.key === key ? settled : null
  return {
    seatMap,
    loading: seatMap === null && current === null,
    refreshing: current === null,
    error: current?.error ?? null,
    outcome: current?.outcome ?? 'ok',
  }
}