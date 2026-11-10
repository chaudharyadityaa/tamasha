import { useEffect, useState } from 'react'
import { userMessage } from '../api/errors'
import { listVenues } from '../api/organizer'
import type { Venue } from '../api/organizerTypes'
import type { PageResponse } from '../api/types'

interface Settled {
  key: string
  data: PageResponse<Venue> | null
  error: string | null
}

/** One page of my venues. `page` starts at 1. */
export function useOrganizerVenues(page: number, size: number, reload: number) {
  const key = `${page}#${size}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listVenues({ page: page - 1, size }, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSettled({ key, data: null, error: userMessage(error) })
        }
      })
    return () => controller.abort()
  }, [page, size, key])

  return {
    data: settled?.data ?? null,
    loading: settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
  }
}