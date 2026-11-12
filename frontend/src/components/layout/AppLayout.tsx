import { Link, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from '../art/BrandMark'
import { Navbar } from './Navbar'

// These pages draw their own full-width sections or frame. Every other page sits in a centered column.
const FULL_WIDTH_PAGES = [
  /^\/$/,
  /^\/events$/,
  /^\/events\/\d+$/,
  /^\/login$/,
  /^\/register$/,
  /^\/my-bookings$/,
  /^\/organizer(\/|$)/,
  /^\/admin(\/|$)/,
]

export function AppLayout() {
  const { pathname } = useLocation()
  const fullWidth = FULL_WIDTH_PAGES.some((pattern) => pattern.test(pathname))

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow print:hidden"
      >
        Skip to content
      </a>
      <div className="print:hidden">
        <Navbar />
      </div>
      <main
        id="main"
        className={fullWidth ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 print:max-w-none print:p-0'}
      >
        <Outlet />
      </main>
      <footer className="bg-midnight text-white/70 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
              <BrandMark className="h-7 w-7" />
              EventHub
            </div>
            <p className="mt-3 text-sm">Find a night out, pick your seats and carry your tickets on your phone.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/events" className="hover:text-white">
                  Browse events
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-white">
                  My bookings
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white">
                  Log in
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">
          EventHub is a portfolio project. Payments are simulated: no real money moves.
        </p>
      </footer>
    </div>
  )
}