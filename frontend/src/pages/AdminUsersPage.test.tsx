import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listUsers, setUserEnabled, setUserRole } from '../api/admin'
import { ApiError } from '../api/errors'
import { AuthContext } from '../auth/authContext'
import { makeAdminUser } from '../test/adminFixtures'
import { authContext } from '../test/fixtures'
import { pageOf } from '../test/organizerFixtures'
import { AdminUsersPage } from './AdminUsersPage'

vi.mock('../api/admin', () => ({
  getAdminDashboard: vi.fn(),
  listUsers: vi.fn(),
  setUserEnabled: vi.fn(),
  setUserRole: vi.fn(),
}))

const me = { id: 1, email: 'admin@example.com', fullName: 'Admin Boss', role: 'ADMIN' as const }
const self = makeAdminUser({ id: 1, email: 'admin@example.com', fullName: 'Admin Boss', role: 'ADMIN' })
const ana = makeAdminUser()

function renderAt(url = '/admin/users') {
  render(
    <AuthContext.Provider value={authContext({ status: 'authenticated', user: me })}>
      <MemoryRouter initialEntries={[url]}>
        <AdminUsersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockReset().mockResolvedValue(pageOf([self, ana], 2))
    vi.mocked(setUserEnabled).mockReset()
    vi.mocked(setUserRole).mockReset()
  })

  it('lists the users with role, account state and join date, asking the API for page 1', async () => {
    renderAt()

    const row = within(await screen.findByRole('row', { name: /Ana Rao/ }))
    expect(row.getByText('ana@example.com')).toBeInTheDocument()
    expect(row.getByText('Customer', { selector: 'span' })).toBeInTheDocument()
    expect(row.getByText('Active')).toBeInTheDocument()
    expect(row.getByText(/Oct 2026/)).toBeInTheDocument()
    expect(listUsers).toHaveBeenCalledWith({ page: 0, size: 20 }, expect.any(AbortSignal))
  })

  it('applies the filters from the form', async () => {
    renderAt()
    const user = userEvent.setup()
    await screen.findByRole('row', { name: /Ana Rao/ })

    await user.type(screen.getByLabelText('Search'), 'ana')
    await user.selectOptions(screen.getByLabelText('Role'), 'ORGANIZER')
    await user.selectOptions(screen.getByLabelText('Status'), 'false')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await screen.findByRole('row', { name: /Ana Rao/ })
    expect(listUsers).toHaveBeenLastCalledWith(
      { q: 'ana', role: 'ORGANIZER', enabled: false, page: 0, size: 20 },
      expect.anything(),
    )
  })

  it('gives the signed-in admin no controls on their own account', async () => {
    renderAt()

    const row = within(await screen.findByRole('row', { name: /Admin Boss/ }))
    expect(row.getByText('This is your account')).toBeInTheDocument()
    expect(row.queryByRole('button')).not.toBeInTheDocument()
    expect(row.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('disables an account only after a second, explicit confirmation, then reloads the list', async () => {
    vi.mocked(setUserEnabled).mockResolvedValue({ ...ana, enabled: false })
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Disable Ana Rao' }))
    expect(screen.getByText(/will not be able to log in/)).toBeInTheDocument()
    expect(setUserEnabled).not.toHaveBeenCalled() // the first click only asks "are you sure?"
    await user.click(screen.getByRole('button', { name: 'Yes, disable' }))

    expect(await screen.findByText('Ana Rao was disabled.')).toBeInTheDocument()
    expect(setUserEnabled).toHaveBeenCalledWith(2, false)
    expect(listUsers).toHaveBeenCalledTimes(2)
  })

  it('lets the admin back out of disabling', async () => {
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Disable Ana Rao' }))
    await user.click(screen.getByRole('button', { name: 'Keep active' }))

    expect(screen.queryByText(/will not be able to log in/)).not.toBeInTheDocument()
    expect(setUserEnabled).not.toHaveBeenCalled()
  })

  it('enables a disabled account with one click', async () => {
    vi.mocked(listUsers).mockResolvedValue(pageOf([self, makeAdminUser({ enabled: false })], 2))
    vi.mocked(setUserEnabled).mockResolvedValue(ana)
    renderAt()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Enable Ana Rao' }))

    expect(await screen.findByText('Ana Rao was enabled.')).toBeInTheDocument()
    expect(setUserEnabled).toHaveBeenCalledWith(2, true)
  })

  it('changes a role only after a second, explicit confirmation', async () => {
    vi.mocked(setUserRole).mockResolvedValue({ ...ana, role: 'ORGANIZER' })
    renderAt()
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Role for Ana Rao'), 'ORGANIZER')
    expect(screen.getByText(/from Customer to Organizer/)).toBeInTheDocument()
    expect(setUserRole).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Yes, change role' }))

    expect(await screen.findByText('Ana Rao is now Organizer.')).toBeInTheDocument()
    expect(setUserRole).toHaveBeenCalledWith(2, 'ORGANIZER')
  })

  it('warns what an administrator can do before promoting someone', async () => {
    renderAt()

    await userEvent.setup().selectOptions(await screen.findByLabelText('Role for Ana Rao'), 'ADMIN')

    expect(screen.getByText(/manage every user, event and booking/)).toBeInTheDocument()
  })

  it('shows the server\'s reason next to the row when a change is refused', async () => {
    vi.mocked(setUserRole).mockRejectedValue(new ApiError({ message: 'The last administrator cannot be demoted', status: 409 }))
    renderAt()
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Role for Ana Rao'), 'ORGANIZER')
    await user.click(screen.getByRole('button', { name: 'Yes, change role' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The last administrator cannot be demoted')
  })

  it('explains an empty search and pages through long lists', async () => {
    vi.mocked(listUsers).mockResolvedValue(pageOf([], 0, 0))
    renderAt('/admin/users?q=nobody')

    expect(await screen.findByText('No users match your search.')).toBeInTheDocument()

    vi.mocked(listUsers).mockResolvedValue(pageOf([ana], 45, 3))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }))
    await screen.findByRole('row', { name: /Ana Rao/ })
    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }))

    await screen.findByRole('row', { name: /Ana Rao/ })
    expect(listUsers).toHaveBeenLastCalledWith({ page: 1, size: 20 }, expect.anything())
  })
})