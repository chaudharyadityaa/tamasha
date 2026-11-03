import axios from 'axios'
import type { ProblemDetail } from './types'

interface ApiErrorInit {
  message: string
  status?: number | null
  title?: string | null
  fieldErrors?: Record<string, string>
  retryAfterSeconds?: number | null
  isNetworkError?: boolean
}

/** Every failed request becomes one of these, so pages handle errors in one consistent way. */
export class ApiError extends Error {
  readonly status: number | null
  readonly title: string | null
  readonly fieldErrors: Record<string, string>
  readonly retryAfterSeconds: number | null
  readonly isNetworkError: boolean

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status ?? null
    this.title = init.title ?? null
    this.fieldErrors = init.fieldErrors ?? {}
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
    this.isNetworkError = init.isNetworkError ?? false
  }
}

function isProblem(data: unknown): data is ProblemDetail {
  return typeof data === 'object' && data !== null
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }
  if (axios.isAxiosError(error)) {
    const response = error.response
    if (!response) {
      return new ApiError({ message: 'Network error', isNetworkError: true })
    }
    const problem: ProblemDetail = isProblem(response.data) ? response.data : {}
    const retryAfter = Number(response.headers?.['retry-after'])
    return new ApiError({
      message: problem.detail ?? problem.title ?? `Request failed (${response.status})`,
      status: response.status,
      title: problem.title ?? null,
      fieldErrors: problem.errors ?? {},
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    })
  }
  return new ApiError({ message: error instanceof Error ? error.message : 'Unexpected error' })
}

function describeWait(seconds: number): string {
  if (seconds < 90) {
    return `${seconds} seconds`
  }
  return `about ${Math.ceil(seconds / 60)} minutes`
}

/** Text that is safe and helpful to show a person. Server internals are never shown for 5xx errors. */
export function userMessage(error: unknown): string {
  const apiError = toApiError(error)
  if (apiError.isNetworkError) {
    return 'Cannot reach the server. Check your connection and try again.'
  }
  if (apiError.status === 429) {
    return apiError.retryAfterSeconds
      ? `Too many attempts. Please try again in ${describeWait(apiError.retryAfterSeconds)}.`
      : 'Too many attempts. Please try again later.'
  }
  if (apiError.status !== null && apiError.status >= 500) {
    return 'Something went wrong on our side. Please try again later.'
  }
  return apiError.message
}