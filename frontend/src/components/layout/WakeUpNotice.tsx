import { useSyncExternalStore } from 'react'
import { Loader2 } from 'lucide-react'
import { getWarmUpState, retryWarmUp, subscribeWarmUp } from '../../api/warmUp'

/** A banner under the navigation that explains a long wait for a sleeping server, or a server that cannot be reached. */
export function WakeUpNotice() {
  const state = useSyncExternalStore(subscribeWarmUp, getWarmUpState, getWarmUpState)

  if (state.phase === 'waking' && state.slow) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 bg-marigold px-4 py-3 text-center text-sm font-medium text-midnight print:hidden"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        <p>
          Waking up the demo server. It sleeps when nobody is using it, so the first visit can take a minute or two.
          Everything will load as soon as it is ready.
        </p>
      </div>
    )
  }

  if (state.phase === 'failed') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-center gap-3 bg-red-50 px-4 py-3 text-center text-sm text-red-900 print:hidden"
      >
        <p>We could not reach the server.</p>
        <button
          type="button"
          onClick={() => void retryWarmUp()}
          className="rounded-full border border-red-300 bg-white px-4 py-1 font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Try again
        </button>
      </div>
    )
  }

  return null
}