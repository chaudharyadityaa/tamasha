import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, Ticket, X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { Button } from '../ui/Button'

interface NavItem {
  to: string
  label: string
  end: boolean
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
  }`

export function Navbar() {
  const { status, user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const items: NavItem[] = [{ to: '/', label: 'Events', end: true }]
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
        <span className="text-sm text-slate-600">Hi, {user.fullName}</span>
        <Button
          variant="secondary"
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
        <Link to="/login" onClick={closeMenu} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Log in
        </Link>
        <Link to="/register" onClick={closeMenu} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Sign up
        </Link>
      </>
    ) : null

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-indigo-700">
          <Ticket className="h-6 w-6" aria-hidden="true" />
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
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-slate-200 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">{account}</div>
        </div>
      )}
    </header>
  )
}