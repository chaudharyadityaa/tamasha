import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { RegisterInput, User } from '../api/types'
import { expiresAtMs } from '../lib/jwt'
import { AuthContext } from './authContext'
import type { AuthContextValue, AuthStatus } from './authContext'
import { tokenStore } from './tokenStore'

const MAX_TIMER_MS = 2_147_000_000 // setTimeout cannot wait longer than about 24 days

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.getToken() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<User | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const endSession = useCallback((expired: boolean) => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    setSessionExpired(expired)
  }, [])

  // On the first load, ask the server who the stored token belongs to (the server is the authority).
  useEffect(() => {
    if (!tokenStore.getToken()) {
      return
    }
    let cancelled = false
    authApi
      .fetchCurrentUser()
      .then((current) => {
        if (!cancelled) {
          setUser(current)
          setStatus('authenticated')
        }
      })
      .catch(() => {
        if (!cancelled) {
          endSession(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [endSession])

  // Any 401 from the API ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Log out at the moment the token expires, instead of waiting for a failing request.
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }
    const token = tokenStore.getToken()
    const expiresAt = token ? expiresAtMs(token) : null
    if (expiresAt === null) {
      return
    }
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMER_MS)
    const timer = window.setTimeout(() => endSession(true), delay)
    return () => window.clearTimeout(timer)
  }, [status, endSession])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await authApi.loginRequest(email, password)
    tokenStore.setToken(response.accessToken)
    setUser(response.user)
    setStatus('authenticated')
    setSessionExpired(false)
    return response.user
  }, [])

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      await authApi.registerRequest(input)
      return login(input.email, input.password)
    },
    [login],
  )

  const logout = useCallback(() => endSession(false), [endSession])
  const clearSessionExpired = useCallback(() => setSessionExpired(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, sessionExpired, login, register, logout, clearSessionExpired }),
    [status, user, sessionExpired, login, register, logout, clearSessionExpired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}