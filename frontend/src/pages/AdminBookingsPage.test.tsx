import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listAdminBookings } from '../api/admin'
import { ApiError } from '../api/errors'
import { makeAdminBookingRow } from '../test/adminFixtures'
import { pageOf } from '../test/organizerFixtures'
import { AdminBookingsPage } from './AdminBookingsPage'

vi.mock('../api/admin', () => ({
  getAdminDashboard: vi.fn(),
  listUsers: vi.fn(),
  setUserEnabled: vi.fn(),
  setUserRole: vi.fn(),
  listAdminEvents: vi.fn(),
  cancelAdminEvent: vi.fn(),
  listAdminBookings: vi.fn(),
  getAdminBooking: vi.fn(),
  cancelAdminBooking: vi.fn(),
}))

function renderAt(url = '/admin/bookings') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminBookingsPage />
    </MemoryRouter>,
  )
}

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    vi.mocked(listAdminBookings).mockReset().mockResolvedValue(pageOf([makeAdminBookingRow()]))
  })

  it('lists bookings with the customer, event, status and total, linking each to its detail page', async () => {
    renderAt()

    const row = within(await screen.findByRole('row', { name: /EH-ADMIN00001/ }))
    expect(row.getByRole('link', { name: 'EH-ADMIN00001' })).toHaveAttribute('href', '/admin/bookings/31')
    expect(row.getByText('Ana Rao')).toBeInTheDocument()
    expect(row.getByText('ana@example.com')).toBeInTheDocument()
    expect(row.getByText('Sitar Evening')).toBeInTheDocument()
    expect(row.getByText('Confirmed', { selector: 'span' })).toBeInTheDocument()
    expect(row.getByText(/999/)).toBeInTheDocument()
    expect(listAdminBookings).toHaveBeenCalledWith({ page: 0, size: 20 }, expect.any(AbortSignal))
  })

  it('applies the filters from the form', async () => {
    renderAt()
    const user = userEvent.setup()
    await screen.findByRole('row', { name: /EH-ADMIN00001/ })

    await user.type(screen.getByLabelText('Search'), 'ana')
    await user.selectOptions(screen.getByLabelText('Status'), 'PENDING_PAYMENT')
    await user.type(screen.getByLabelText('Event ID'), '21')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await screen.findByRole('row', { name: /EH-ADMIN00001/ })
    expect(listAdminBookings).toHaveBeenLastCalledWith(
      { q: 'ana', status: 'PENDING_PAYMENT', eventId: 21, page: 0, size: 20 },
      expect.anything(),
    )
  })

  it('explains an empty search', async () => {
    vi.mocked(listAdminBookings).mockResolvedValue(pageOf([], 0, 0))
    renderAt('/admin/bookings?status=EXPIRED')

    expect(await screen.findByText('No bookings match your search.')).toBeInTheDocument()
    expect(listAdminBookings).toHaveBeenCalledWith({ status: 'EXPIRED', page: 0, size: 20 }, expect.anything())
  })

  it('pages through long lists', async () => {
    vi.mocked(listAdminBookings).mockResolvedValue(pageOf([makeAdminBookingRow()], 45, 3))
    renderAt()
    await screen.findByRole('row', { name: /EH-ADMIN00001/ })

    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }))

    await screen.findByRole('row', { name: /EH-ADMIN00001/ })
    expect(listAdminBookings).toHaveBeenLastCalledWith({ page: 1, size: 20 }, expect.anything())
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(listAdminBookings)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(pageOf([makeAdminBookingRow()]))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('row', { name: /EH-ADMIN00001/ })).toBeInTheDocument()
  })
})