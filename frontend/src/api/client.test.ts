import type { AxiosAdapter } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { http } from './client'
import { resetWarmUp, startWarmUp } from './warmUp'

/** Replaces the network with a function that records which URLs were requested. */
function recordRequests(): string[] {
  const urls: string[] = []
  http.defaults.adapter = (async (config) => {
    urls.push(String(config.url))
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
  }) as AxiosAdapter
  return urls
}

describe('API client and the warm-up', () => {
  afterEach(() => {
    resetWarmUp()
  })

  it('sends requests straight away when no warm-up is running', async () => {
    const urls = recordRequests()

    await http.get('/api/ping')

    expect(urls).toEqual(['/api/ping'])
  })

  it('holds requests back until the server has answered the warm-up', async () => {
    const urls = recordRequests()
    let release!: () => void
    void startWarmUp(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    const request = http.get('/api/ping')
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(urls).toEqual([])

    release()
    await request

    expect(urls).toEqual(['/api/ping'])
  })
})