import type { ReactNode, RefObject } from 'react'

interface PageBandProps {
  title: string
  subtitle?: string
  /** Lets the page move keyboard focus to the title, for example after changing pages of results. */
  headingRef?: RefObject<HTMLHeadingElement | null>
  /** Content that sits on the band, such as a search form. */
  children?: ReactNode
}

/** The calm header of an inner page: a flat midnight band with faint rings. Nothing on it moves. */
export function PageBand({ title, subtitle, headingRef, children }: PageBandProps) {
  return (
    <section aria-labelledby="page-heading" className="relative isolate overflow-hidden bg-midnight text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 -z-10 h-[24rem] w-[24rem] rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute right-8 -top-8 -z-10 h-56 w-56 rounded-full border border-white/10" />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
        <h1
          id="page-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-4xl font-extrabold tracking-tight focus:outline-none sm:text-5xl"
        >
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-2xl text-lg text-white/75">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  )
}