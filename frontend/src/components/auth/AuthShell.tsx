import type { ReactNode } from 'react'
import { Crowd } from '../art/Crowd'
import { StageLights } from '../art/StageLights'

interface AuthShellProps {
  /** The big line on the stage panel (shown on wide screens only). */
  panelTitle: string
  panelText: string
  children: ReactNode
}

/** The frame around the login and register forms: a stage on the left (wide screens) and the form on the right. */
export function AuthShell({ panelTitle, panelText, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100vh-4.25rem)] lg:grid-cols-[1fr_1.1fr]">
      <aside aria-hidden="true" className="relative isolate hidden overflow-hidden bg-midnight text-white lg:block">
        <StageLights />
        <div className="relative z-10 px-12 pt-20">
          <p className="max-w-sm text-balance font-display text-4xl font-extrabold leading-tight xl:text-5xl">{panelTitle}</p>
          <p className="mt-4 max-w-sm text-white/75">{panelText}</p>
        </div>
        <Crowd className="absolute inset-x-0 bottom-0 z-20" />
      </aside>

      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}