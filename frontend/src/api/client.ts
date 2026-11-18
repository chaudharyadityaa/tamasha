import axios from 'axios'
import { tokenStore } from '../auth/tokenStore'
import { toApiError } from './errors'
import { waitUntilReady } from './warmUp'

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** The auth provider registers a function here that logs the user out when the server says 401. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  // While a sleeping server is waking up, hold requests back instead of letting them all time out.
  await waitUntilReady()
  const token = tokenStore.getToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    const isLoginOrRegister = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register')
    // A 401 on any other request means our token is no longer accepted: end the session.
    if (apiError.status === 401 && !isLoginOrRegister) {
      unauthorizedHandler?.()
    }
    return Promise.reject(apiError)
  },
)