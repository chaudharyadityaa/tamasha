import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import type { PageResponse } from '../api/types'

interface Settled<T> {
  key: string
  data: PageResponse<T> | null
  error: string | null
}

/**
 * Loads a list page for a URL query string. `load` must be a function defined once at module level.
 * The previous results stay visible while a new search loads, and outdated requests are cancelled.
 */
export function usePagedList<T>(
  load: (searchString: string, signal: AbortSignal) => Promise<PageResponse<T>>,
  searchString: string,
  reload: number,
) {
  const key = `${searchString}#${reload}`
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    load(searchString, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [load, searchString, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}