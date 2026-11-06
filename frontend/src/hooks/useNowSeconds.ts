import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 1000)
  return () => window.clearInterval(timer)
}

function getSnapshot(): number {
  return Math.floor(Date.now() / 1000)
}

/** The current time in whole seconds, re-rendering once a second. Used for countdowns. */
export function useNowSeconds(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}