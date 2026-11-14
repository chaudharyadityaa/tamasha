import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/authContext'
import type { AuthContextValue } from '../../auth/authContext'
import { BRAND } from '../../lib/brand'
import { authContext, customer } from '../../test/fixtures'
import { Navbar } from './Navbar'

function renderNavbar(value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const signedIn = (role: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN', logout = vi.fn()) =>
  authContext({ status: 'authenticated', user: { ...customer, role }, logout })

describe('Navbar', () => {
  it('offers Log in and Sign up to a visitor who is not signed in', () => {
    renderNavbar(authContext())

    expect(screen.getByRole('link', { name: BRAND.name })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('link', { name: 'My bookings' })).not.toBeInTheDocument()
  })

  it('greets a customer, shows My bookings and logs out', async () => {
    const logout = vi.fn()
    renderNavbar(signedIn('CUSTOMER', logout))

    expect(screen.getByText('Hi, Ana')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Organizer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('shows the Organizer link only to organizers and the Admin link only to administrators', () => {
    renderNavbar(signedIn('ORGANIZER'))
    expect(screen.getByRole('link', { name: 'Organizer' })).toHaveAttribute('href', '/organizer')
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows the Admin link to administrators', () => {
    renderNavbar(signedIn('ADMIN'))
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })

  it('opens and closes the menu on small screens', async () => {
    renderNavbar(authContext())
    const user = userEvent.setup()
    const toggle = screen.getByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('mobile-menu')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(document.getElementById('mobile-menu')).toBeNull()
  })
})