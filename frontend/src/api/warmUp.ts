import axios from 'axios'

export type WarmUpPhase = 'idle' | 'waking' | 'ready' | 'failed'

export interface WarmUpState {
  phase: WarmUpPhase
  /** True once the wait has lasted long enough that people should be told what is going on. */
  slow: boolean
}

type Probe = () => Promise<void>

const SLOW_AFTER_MS = 2_500
const PAUSE_BETWEEN_TRIES_MS = 3_000
// A hosting proxy answers 502, 503 or 504 while a sleeping server is still starting.
const STILL_STARTING = new Set([502, 503, 504])
// During development a missing backend should be reported quickly. A sleeping production server needs minutes.
const GIVE_UP_AFTER_MS = import.meta.env.DEV ? 8_000 : 150_000

// ---------- waiting for the server ----------

export interface ServerProbe {
  /** One attempt to reach the server. */
  ping: () => Promise<'answered' | 'unreachable'>
  sleep: (ms: number) => Promise<void>
  now: () => number
}

/** Tries again and again until the server answers, and gives up (by throwing) once the time limit has passed. */
export async function waitForServer(
  probe: ServerProbe,
  limitMs: number,
  pauseMs: number = PAUSE_BETWEEN_TRIES_MS,
): Promise<void> {
  const deadline = probe.now() + limitMs
  for (;;) {
    if ((await probe.ping()) === 'answered') {
      return
    }
    if (probe.now() >= deadline) {
      throw new Error('The server did not answer in time')
    }
    await probe.sleep(pauseMs)
  }
}

async function pingServer(): Promise<'answered' | 'unreachable'> {
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  try {
    // One small public request: it wakes the server and, because it reads events, the database too.
    await axios.get(`${baseURL}/api/events`, { params: { size: 1 }, timeout: 20_000 })
    return 'answered'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && !STILL_STARTING.has(error.response.status)) {
      return 'answered' // any real answer, even an error page of our own, means the server is up
    }
    // No answer at all: a server that is still waking up, a proxy error the browser hides, or a real outage.
    return 'unreachable'
  }
}

function realProbe(): Promise<void> {
  return waitForServer(
    {
      ping: pingServer,
      sleep: (ms) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
      now: () => Date.now(),
    },
    GIVE_UP_AFTER_MS,
  )
}

// ---------- the shared state that the banner and the API client read ----------

let state: WarmUpState = { phase: 'idle', slow: false }
let ready: Promise<void> | null = null
let slowTimer: number | undefined
let generation = 0
let currentProbe: Probe = realProbe
const listeners = new Set<() => void>()

function publish(next: WarmUpState): void {
  state = next
  listeners.forEach((listener) => listener())
}

export function subscribeWarmUp(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The same object until something changes, which is what React needs from an external store. */
export function getWarmUpState(): WarmUpState {
  return state
}

function finish(phase: 'ready' | 'failed'): void {
  window.clearTimeout(slowTimer)
  publish({ phase, slow: false })
}

/** Starts waking the server. Pass a probe only in tests. */
export function startWarmUp(probe: Probe = currentProbe): Promise<void> {
  currentProbe = probe
  const mine = ++generation
  window.clearTimeout(slowTimer)
  publish({ phase: 'waking', slow: false })
  slowTimer = window.setTimeout(() => {
    if (mine === generation && state.phase === 'waking') {
      publish({ phase: 'waking', slow: true })
    }
  }, SLOW_AFTER_MS)

  ready = probe().then(
    () => {
      if (mine === generation) finish('ready')
    },
    () => {
      // A newer warm-up has taken over: ignore the result of this older one.
      if (mine === generation) finish('failed')
    },
  )
  return ready
}

/** Starts again after a failure, with the same probe as before. */
export function retryWarmUp(): Promise<void> {
  return startWarmUp(currentProbe)
}

/** Resolves when the server has answered or the warm-up gave up. It resolves at once if no warm-up is running. */
export function waitUntilReady(): Promise<void> {
  return ready ?? Promise.resolve()
}

/** For tests: forget everything. */
export function resetWarmUp(): void {
  window.clearTimeout(slowTimer)
  generation += 1
  ready = null
  currentProbe = realProbe
  publish({ phase: 'idle', slow: false })
}