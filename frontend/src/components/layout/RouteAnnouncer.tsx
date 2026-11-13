import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { pageTitle } from '../../lib/pageTitles'

/**
 * In a single-page app the browser does not do these things by itself when the "page" changes:
 * update the tab title, go back to the top, and move keyboard and screen-reader focus to the new content.
 * It renders nothing.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    document.title = pageTitle(pathname)
    // Not on the first load (the browser handles that) and not when only the query string changed (filters, paging).
    if (previous.current !== null && previous.current !== pathname) {
      window.scrollTo(0, 0)
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    previous.current = pathname
  }, [pathname])

  return null
}