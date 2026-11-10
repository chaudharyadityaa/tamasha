import { useEffect, useState } from 'react'
import { toApiError, userMessage } from '../api/errors'

interface Settled {
  key: string
  error: string | null
  notFound: boolean
}

/**
 * Loads one thing (an event, ticket types, ...) with cancellation and 404 handling. Pass a function that is
 * defined once at module level (like getOrganizerEvent) and a simple id; change `reload` to load again.
 * The previous result stays available while a reload runs, so lists never flash empty.
 * Give the page a `key` when the id changes so one item's data is never shown for another.
 */
export function useApiResource<A extends string | number, T>(
  fetcher: (arg: A, signal: AbortSignal) => Promise<T>,
  arg: A | null,
  reload: number,
) {
  const key = arg === null ? null : `${String(arg)}#${reload}`
  const [data, setData] = useState<T | null>(null)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (arg === null || key === null) {
      return
    }
    const controller = new AbortController()
    fetcher(arg, controller.signal)
      .then((result) => {
        setData(result)
        setSettled({ key, error: null, notFound: false })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        const notFound = toApiError(error).status === 404
        setSettled({ key, error: notFound ? null : userMessage(error), notFound })
      })
    return () => controller.abort()
  }, [fetcher, arg, key])

  const current = key !== null && settled?.key === key ? settled : null
  return {
    data,
    error: current?.error ?? null,
    notFound: current?.notFound ?? false,
    loading: key !== null && current === null && data === null,
  }
}