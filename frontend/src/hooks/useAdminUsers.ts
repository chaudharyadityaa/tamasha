import { useEffect, useState } from 'react'
import { listUsers } from '../api/admin'
import type { AdminUser } from '../api/adminTypes'
import { userMessage } from '../api/errors'
import type { PageResponse } from '../api/types'
import { toUsersParams } from '../lib/adminUserSearch'

interface Settled {
  key: string
  data: PageResponse<AdminUser> | null
  error: string | null
}

/** Loads the users for a URL query string. The previous results stay visible while a new search loads. */
export function useAdminUsers(searchString: string, reload: number) {
  const key = `${searchString}#${reload}`
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listUsers(toUsersParams(new URLSearchParams(searchString)), controller.signal)
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