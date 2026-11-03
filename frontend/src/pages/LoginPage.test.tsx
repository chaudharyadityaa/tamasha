import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import type { User } from '../api/types'
import { AuthContext } from '../auth/authContext'
import type { AuthContextValue } from '../auth/authContext'
import { LoginPage } from './LoginPage'

const ana: User = { id: 1, email: 'ana@example.com', fullName: 'Ana', role: 'CUSTOMER' }

function renderLogin(login: AuthContextValue['login']) {
  const value: AuthContextValue = {
    status: 'anonymous',
    user: null,
    sessionExpired: false,
    login,
    register: vi.fn(),
    logout: vi.fn(),
    clearSessionExpired: vi.fn(),
  }
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('LoginPage', () => {
  it('asks for missing fields without calling the server', async () => {
    const login = vi.fn()
    renderLogin(login)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('sends the trimmed email and the password', async () => {
    const login = vi.fn().mockResolvedValue(ana)
    renderLogin(login)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email'), '  ana@example.com ')
    await user.type(screen.getByLabelText('Password'), 'Sup3rSecret!')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(login).toHaveBeenCalledWith('ana@example.com', 'Sup3rSecret!')
  })

  it('explains a rate limit with the wait time', async () => {
    const login = vi
      .fn()
      .mockRejectedValue(new ApiError({ message: 'Too many attempts', status: 429, retryAfterSeconds: 900 }))
    renderLogin(login)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'whatever1')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('about 15 minutes')
  })
})