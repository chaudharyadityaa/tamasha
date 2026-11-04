import { useEffect, useState } from 'react'
import { toApiError, userMessage } from '../api/errors'
import { getEvent } from '../api/events'
import type { EventDetail } from '../api/types'

interface Settled {
  key: string
  event: EventDetail | null
  error: string | null
  notFound: boolean
}

/** Loads one event. Pass null to skip loading (for example when the id in the URL is not a number). */
export function useEventDetail(id: string | null, reload: number) {
  const key = id === null ? null : `${id}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (id === null || key === null) {
      return
    }
    const controller = new AbortController()
    getEvent(Number(id), controller.signal)
      .then((event) => setSettled({ key, event, error: null, notFound: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        // The server answers 404 for unknown events, and also for drafts and cancelled ones on purpose.
        const notFound = toApiError(error).status === 404
        setSettled({ key, event: null, error: notFound ? null : userMessage(error), notFound })
      })
    return () => controller.abort()
  }, [id, key])

  const current = key !== null && settled?.key === key ? settled : null
  return {
    event: current?.event ?? null,
    error: current?.error ?? null,
    notFound: current?.notFound ?? false,
    loading: key !== null && current === null,
  }
}