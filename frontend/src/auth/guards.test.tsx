import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../api/types'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'
import { RequireAuth, RequireRole } from './guards'

const customer: User = { id: 1, email: 'ana@example.com', fullName: 'Ana', role: 'CUSTOMER' }
const organizer: User = { id: 2, email: 'org@example.com', fullName: 'Org', role: 'ORGANIZER' }

function context(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    sessionExpired: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearSessionExpired: vi.fn(),
    ...overrides,
  }
}

function renderAt(path: string, value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/access-denied" element={<p>denied page</p>} />
          <Route path="/private" element={<RequireAuth><p>private content</p></RequireAuth>} />
          <Route
            path="/organizer"
            element={<RequireRole roles={['ORGANIZER']}><p>organizer content</p></RequireRole>}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('route guards', () => {
  it('sends anonymous visitors to the login page', () => {
    renderAt('/private', context({ status: 'anonymous' }))

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('lets a logged-in user into a private page', () => {
    renderAt('/private', context({ status: 'authenticated', user: customer }))

    expect(screen.getByText('private content')).toBeInTheDocument()
  })

  it('shows access denied when the role is wrong', () => {
    renderAt('/organizer', context({ status: 'authenticated', user: customer }))

    expect(screen.getByText('denied page')).toBeInTheDocument()
  })

  it('lets the right role in', () => {
    renderAt('/organizer', context({ status: 'authenticated', user: organizer }))

    expect(screen.getByText('organizer content')).toBeInTheDocument()
  })

  it('waits with a spinner while the session is being checked', () => {
    renderAt('/private', context({ status: 'loading' }))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('private content')).not.toBeInTheDocument()
  })
})