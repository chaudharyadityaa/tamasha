import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { BrandMark } from '../art/BrandMark'
import { Button } from '../ui/Button'

interface NavItem {
  to: string
  label: string
  end: boolean
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
  }`

const signUpClass =
  'rounded-full bg-marigold px-5 py-2 text-sm font-semibold text-midnight transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'

export function Navbar() {
  const { status, user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const items: NavItem[] = [{ to: '/events', label: 'Events', end: false }]
  if (user) {
    items.push({ to: '/my-bookings', label: 'My bookings', end: false })
  }
  if (user?.role === 'ORGANIZER') {
    items.push({ to: '/organizer', label: 'Organizer', end: false })
  }
  if (user?.role === 'ADMIN') {
    items.push({ to: '/admin', label: 'Admin', end: false })
  }

  const account =
    status === 'authenticated' && user ? (
      <>
        <span className="text-sm text-white/80">Hi, {user.fullName}</span>
        <Button
          variant="onDark"
          onClick={() => {
            closeMenu()
            logout()
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </>
    ) : status === 'anonymous' ? (
      <>
        <Link to="/login" onClick={closeMenu} className={linkClass({ isActive: false })}>
          Log in
        </Link>
        <Link to="/register" onClick={closeMenu} className={signUpClass}>
          Sign up
        </Link>
      </>
    ) : null

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-midnight/95 text-white backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-full font-display text-xl font-bold tracking-tight text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
        >
          <BrandMark />
          EventHub
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">{account}</div>

        <button
          type="button"
          className="rounded-full p-2 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-white/10 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">{account}</div>
        </div>
      )}
    </header>
  )
}