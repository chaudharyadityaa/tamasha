import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import { searchEvents } from '../api/events'
import type { EventSummary, PageResponse } from '../api/types'
import { toApiParams } from '../lib/eventSearch'

interface Settled {
  key: string
  data: PageResponse<EventSummary> | null
  error: string | null
}

/**
 * Loads events for a URL query string. While a new search is loading, the previous results stay
 * available (so the page does not flash empty), and outdated requests are cancelled.
 */
export function useEventSearch(searchString: string, reload: number) {
  const key = `${searchString}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    searchEvents(toApiParams(new URLSearchParams(searchString)), controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [searchString, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}