import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '../ui/Button'

interface ErrorBoundaryState {
  failed: boolean
}

/** Catches errors thrown while a page renders, so people see a helpful message instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected error while rendering a page', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }
    return (
      <div role="alert" className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-slate-600">
          An unexpected error stopped this page from loading. Your account and bookings are not affected.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Go to the home page
          </a>
        </div>
      </div>
    )
  }
}