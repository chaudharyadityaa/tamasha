import { useId } from 'react'

/** A unique id that is safe to use inside url(#...) in SVG. */
export function useSvgId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '')
}