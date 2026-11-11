import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/errors'
import { getEventStats } from '../../api/organizerOperations'
import { makeStats } from '../../test/organizerOpsFixtures'
import { SalesOverview } from './SalesOverview'

vi.mock('../../api/organizerOperations', () => ({
  getVenue: vi.fn(),
  createSeatBlock: vi.fn(),
  deleteSeatSection: vi.fn(),
  getEventStats: vi.fn(),
  listEventBookings: vi.fn(),
  checkInTicket: vi.fn(),
  getAttendance: vi.fn(),
}))

describe('SalesOverview', () => {
  beforeEach(() => {
    vi.mocked(getEventStats).mockReset().mockResolvedValue(makeStats())
  })

  it('shows revenue, occupancy, bookings by status and a table per ticket type', async () => {
    render(<SalesOverview eventId={7} />)

    expect(await screen.findByText(/1,998/)).toBeInTheDocument()
    expect(screen.getByText('8.0%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Occupancy' })).toHaveAttribute('aria-valuenow', '8')
    expect(screen.getByText(/4 sold · 2 held · 44 available · capacity 50/)).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByRole('row', { name: /Standing.*44/ })).toBeInTheDocument()
    expect(getEventStats).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('says so when there are no bookings yet', async () => {
    vi.mocked(getEventStats).mockResolvedValue(makeStats({ bookingsByStatus: {}, ticketTypes: [] }))
    render(<SalesOverview eventId={7} />)

    expect(await screen.findByText('No bookings yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a status it does not know by its raw name instead of hiding it', async () => {
    vi.mocked(getEventStats).mockResolvedValue(makeStats({ bookingsByStatus: { WEIRD_STATUS: 3 } }))
    render(<SalesOverview eventId={7} />)

    expect(await screen.findByText('WEIRD_STATUS')).toBeInTheDocument()
  })

  it('shows a friendly error and loads again when Refresh is pressed', async () => {
    vi.mocked(getEventStats)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(makeStats())
    render(<SalesOverview eventId={7} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByText(/1,998/)).toBeInTheDocument()
  })
})