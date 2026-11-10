import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import { listOrganizerEvents } from '../api/organizer'
import type { EventStatus, OrganizerEvent } from '../api/organizerTypes'
import type { PageResponse } from '../api/types'

export const ORGANIZER_EVENTS_PAGE_SIZE = 10

interface Settled {
  key: string
  data: PageResponse<OrganizerEvent> | null
  error: string | null
}

/** One page of my events, optionally filtered by status. `page` starts at 1. */
export function useOrganizerEvents(status: EventStatus | undefined, page: number, reload: number) {
  const key = `${status ?? 'all'}#${page}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const params = { page: page - 1, size: ORGANIZER_EVENTS_PAGE_SIZE }
    listOrganizerEvents(status ? { ...params, status } : params, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [status, page, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}