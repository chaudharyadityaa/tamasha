import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelAdminEvent, listAdminEvents } from '../api/admin'
import { ApiError } from '../api/errors'
import { makeAdminEvent } from '../test/adminFixtures'
import { pageOf } from '../test/organizerFixtures'
import { AdminEventsPage } from './AdminEventsPage'

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

function renderAt(url = '/admin/events') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminEventsPage />
    </MemoryRouter>,
  )
}

describe('AdminEventsPage', () => {
  beforeEach(() => {
    vi.mocked(listAdminEvents).mockReset().mockResolvedValue(pageOf([makeAdminEvent()]))
    vi.mocked(cancelAdminEvent).mockReset()
  })

  it('lists events with organizer, venue, status and starting price, asking the API for page 1', async () => {
    renderAt()

    const row = within(await screen.findByRole('row', { name: /Sitar Evening/ }))
    expect(row.getByText('Asha Events')).toBeInTheDocument()
    expect(row.getByText('City Hall')).toBeInTheDocument()
    expect(row.getByText('Agra')).toBeInTheDocument()
    expect(row.getByText('Published', { selector: 'span' })).toBeInTheDocument()
    expect(row.getByText('499.50')).toBeInTheDocument()
    expect(row.getByRole('link', { name: 'Public page' })).toHaveAttribute('href', '/events/21')
    expect(listAdminEvents).toHaveBeenCalledWith({ page: 0, size: 20 }, expect.any(AbortSignal))
  })

  it('applies the filters from the form', async () => {
    renderAt()
    const user = userEvent.setup()
    await screen.findByRole('row', { name: /Sitar Evening/ })

    await user.type(screen.getByLabelText('Search'), 'sitar')
    await user.selectOptions(screen.getByLabelText('Status'), 'PUBLISHED')
    await user.type(screen.getByLabelText('Organizer ID'), '5')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await screen.findByRole('row', { name: /Sitar Evening/ })
    expect(listAdminEvents).toHaveBeenLastCalledWith(
      { q: 'sitar', status: 'PUBLISHED', organizerId: 5, page: 0, size: 20 },
      expect.anything(),
    )
  })

  it('cancels an event only after a second confirmation that explains the consequences, then reloads', async () => {
    vi.mocked(cancelAdminEvent).mockResolvedValue(makeAdminEvent({ status: 'CANCELLED' }))
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel Sitar Evening' }))
    expect(screen.getByText(/This is permanent/)).toBeInTheDocument()
    expect(screen.getByText(/demo payments are refunded/)).toBeInTheDocument()
    expect(cancelAdminEvent).not.toHaveBeenCalled() // the first click only asks "are you sure?"
    await user.click(screen.getByRole('button', { name: 'Yes, cancel event' }))

    expect(await screen.findByText('“Sitar Evening” was cancelled.')).toBeInTheDocument()
    expect(cancelAdminEvent).toHaveBeenCalledWith(21)
    expect(listAdminEvents).toHaveBeenCalledTimes(2)
  })

  it('lets the admin back out of cancelling', async () => {
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel Sitar Evening' }))
    await user.click(screen.getByRole('button', { name: 'Keep event' }))

    expect(screen.queryByText(/This is permanent/)).not.toBeInTheDocument()
    expect(cancelAdminEvent).not.toHaveBeenCalled()
  })

  it('offers no cancel button or public page for an event that is already cancelled', async () => {
    vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeAdminEvent({ status: 'CANCELLED' })]))
    renderAt()

    const row = within(await screen.findByRole('row', { name: /Sitar Evening/ }))
    expect(row.getByText('Cancelled', { selector: 'span' })).toBeInTheDocument()
    expect(row.queryByRole('button')).not.toBeInTheDocument()
    expect(row.queryByRole('link', { name: 'Public page' })).not.toBeInTheDocument()
  })

  it('shows the server\'s reason next to the row when cancelling is refused', async () => {
    vi.mocked(cancelAdminEvent).mockRejectedValue(new ApiError({ message: 'This event is already cancelled', status: 409 }))
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel Sitar Evening' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel event' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already cancelled')
  })

  it('explains an empty search and pages through long lists', async () => {
    vi.mocked(listAdminEvents).mockResolvedValue(pageOf([], 0, 0))
    renderAt('/admin/events?q=nothing')

    expect(await screen.findByText('No events match your search.')).toBeInTheDocument()

    vi.mocked(listAdminEvents).mockResolvedValue(pageOf([makeAdminEvent()], 45, 3))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await screen.findByRole('row', { name: /Sitar Evening/ })
    await user.click(screen.getByRole('button', { name: /next/i }))

    await screen.findByRole('row', { name: /Sitar Evening/ })
    expect(listAdminEvents).toHaveBeenLastCalledWith({ page: 1, size: 20 }, expect.anything())
  })
})