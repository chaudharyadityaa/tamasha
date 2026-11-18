import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServerProbe } from './warmUp'
import { getWarmUpState, resetWarmUp, retryWarmUp, startWarmUp, waitForServer, waitUntilReady } from './warmUp'

function pending() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('warm-up state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetWarmUp()
  })

  afterEach(() => {
    resetWarmUp()
    vi.useRealTimers()
  })

  it('holds nothing back when no warm-up was started', async () => {
    await expect(waitUntilReady()).resolves.toBeUndefined()

    expect(getWarmUpState()).toEqual({ phase: 'idle', slow: false })
  })

  it('is quiet at first and only calls the wait slow after 2.5 seconds', async () => {
    const probe = pending()
    void startWarmUp(() => probe.promise)
    expect(getWarmUpState()).toEqual({ phase: 'waking', slow: false })

    await vi.advanceTimersByTimeAsync(2_499)
    expect(getWarmUpState().slow).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(getWarmUpState()).toEqual({ phase: 'waking', slow: true })
  })

  it('becomes ready without ever calling the wait slow when the server answers quickly', async () => {
    const probe = pending()
    void startWarmUp(() => probe.promise)

    probe.resolve()
    await flush()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(getWarmUpState()).toEqual({ phase: 'ready', slow: false })
  })

  it('becomes ready after a slow wake and stops being slow', async () => {
    const probe = pending()
    void startWarmUp(() => probe.promise)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(getWarmUpState().slow).toBe(true)

    probe.resolve()
    await flush()

    expect(getWarmUpState()).toEqual({ phase: 'ready', slow: false })
  })

  it('becomes failed when the server never answers, and still lets requests through', async () => {
    const probe = pending()
    void startWarmUp(() => probe.promise)

    probe.reject(new Error('gave up'))
    await flush()

    expect(getWarmUpState()).toEqual({ phase: 'failed', slow: false })
    await expect(waitUntilReady()).resolves.toBeUndefined()
  })

  it('makes waiting requests wait until the server has answered', async () => {
    const probe = pending()
    void startWarmUp(() => probe.promise)
    let released = false
    void waitUntilReady().then(() => {
      released = true
    })

    await flush()
    expect(released).toBe(false)
    probe.resolve()
    await flush()

    expect(released).toBe(true)
  })

  it('tries again with the same probe when asked to retry', async () => {
    const probe = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(undefined)
    void startWarmUp(probe)
    await flush()
    expect(getWarmUpState().phase).toBe('failed')

    void retryWarmUp()
    await flush()

    expect(probe).toHaveBeenCalledTimes(2)
    expect(getWarmUpState().phase).toBe('ready')
  })

  it('ignores the result of an older warm-up once a newer one has started', async () => {
    const older = pending()
    void startWarmUp(() => older.promise)
    void startWarmUp(() => Promise.resolve())
    await flush()
    expect(getWarmUpState().phase).toBe('ready')

    older.reject(new Error('too late'))
    await flush()

    expect(getWarmUpState().phase).toBe('ready')
  })
})

describe('waitForServer', () => {
  function fakeProbe(answers: ('answered' | 'unreachable')[]) {
    let clock = 0
    const ping = vi.fn(async () => answers.shift() ?? 'unreachable')
    const sleep = vi.fn(async (ms: number) => {
      clock += ms
    })
    const probe: ServerProbe = { ping, sleep, now: () => clock }
    return { probe, ping, sleep }
  }

  it('returns as soon as the server answers', async () => {
    const { probe, ping, sleep } = fakeProbe(['answered'])

    await waitForServer(probe, 10_000)

    expect(ping).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('keeps trying while the server is still starting, then succeeds', async () => {
    const { probe, ping, sleep } = fakeProbe(['unreachable', 'unreachable', 'answered'])

    await waitForServer(probe, 10_000, 3_000)

    expect(ping).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(3_000)
  })

  it('gives up once the time limit has passed', async () => {
    const { probe, ping } = fakeProbe([])

    await expect(waitForServer(probe, 10_000, 3_000)).rejects.toThrow('did not answer in time')

    expect(ping).toHaveBeenCalledTimes(5) // at 0, 3, 6, 9 and 12 seconds
  })
})