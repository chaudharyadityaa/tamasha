import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, toApiError, userMessage } from './errors'

function httpError(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response = { status, statusText: '', data, headers, config } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response)
}

describe('toApiError and userMessage', () => {
  it('keeps the field errors the server sends for a validation failure', () => {
    const error = toApiError(
      httpError(400, {
        title: 'Validation failed',
        detail: 'Request validation failed',
        errors: { email: 'must be a well-formed email address' },
      }),
    )

    expect(error.status).toBe(400)
    expect(error.fieldErrors.email).toBe('must be a well-formed email address')
  })

  it('shows the server message for conflicts', () => {
    const error = httpError(409, { title: 'Conflict', detail: 'An account with this email already exists' })

    expect(userMessage(error)).toBe('An account with this email already exists')
  })

  it('explains rate limits using the Retry-After header', () => {
    const limited = httpError(429, { detail: 'Too many attempts' }, { 'retry-after': '900' })

    expect(toApiError(limited).retryAfterSeconds).toBe(900)
    expect(userMessage(limited)).toBe('Too many attempts. Please try again in about 15 minutes.')
    expect(userMessage(httpError(429, {}, { 'retry-after': '30' }))).toContain('30 seconds')
  })

  it('recognises a network failure and passes an existing ApiError through unchanged', () => {
    const network = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))
    const existing = new ApiError({ message: 'boom', status: 404 })

    expect(network.isNetworkError).toBe(true)
    expect(userMessage(network)).toContain('Cannot reach the server')
    expect(toApiError(existing)).toBe(existing)
  })

  it('never shows server internals for 5xx errors', () => {
    const error = httpError(500, { detail: 'NullPointerException at com.eventhub.Secret' })

    expect(userMessage(error)).toBe('Something went wrong on our side. Please try again later.')
  })
})