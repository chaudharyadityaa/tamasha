import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import type { User } from '../api/types'
import { AuthContext } from '../auth/authContext'
import type { AuthContextValue } from '../auth/authContext'
import { authContext } from '../test/fixtures'
import { RegisterPage } from './RegisterPage'

const ana: User = { id: 1, email: 'ana@example.com', fullName: 'Ana Rao', role: 'CUSTOMER' }

function renderRegister(register: AuthContextValue['register']) {
  render(
    <AuthContext.Provider value={authContext({ register })}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

async function fill(user: ReturnType<typeof userEvent.setup>, confirm = 'Sup3rSecret!') {
  await user.type(screen.getByLabelText('Full name'), ' Ana Rao ')
  await user.type(screen.getByLabelText('Email'), ' ana@example.com ')
  await user.type(screen.getByLabelText('Password'), 'Sup3rSecret!')
  await user.type(screen.getByLabelText('Confirm password'), confirm)
}

describe('RegisterPage', () => {
  it('asks for every field without calling the server', async () => {
    const register = vi.fn()
    renderRegister(register)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('catches passwords that do not match', async () => {
    const register = vi.fn()
    renderRegister(register)
    const user = userEvent.setup()

    await fill(user, 'something-else')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('sends the trimmed name and email with the password', async () => {
    const register = vi.fn().mockResolvedValue(ana)
    renderRegister(register)
    const user = userEvent.setup()

    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(register).toHaveBeenCalledWith({ fullName: 'Ana Rao', email: 'ana@example.com', password: 'Sup3rSecret!' })
  })

  it('tells the visitor when the email is already taken', async () => {
    const register = vi.fn().mockRejectedValue(new ApiError({ message: 'Conflict', status: 409 }))
    renderRegister(register)
    const user = userEvent.setup()

    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument()
  })
})