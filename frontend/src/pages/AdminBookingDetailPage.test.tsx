import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelAdminBooking, getAdminBooking } from '../api/admin'
import { ApiError } from '../api/errors'
import { makeBooking } from '../test/fixtures'
import { AdminBookingDetailPage } from './AdminBookingDetailPage'

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

function renderAt(path = '/admin/bookings/55') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/bookings/:id" element={<AdminBookingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const demoPaid = { provider: 'DEMO', status: 'SUCCEEDED' as const, demo: true }
const confirmed = () => makeBooking({ status: 'CONFIRMED', payment: demoPaid })

describe('AdminBookingDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminBooking).mockReset().mockResolvedValue(confirmed())
    vi.mocked(cancelAdminBooking).mockReset()
  })

  it('shows the booking, what was bought, the total and the demo payment', async () => {
    renderAt()

    expect(await screen.findByText('EH-ABCDEFGHJK')).toBeInTheDocument()
    expect(screen.getByText('Confirmed', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Sitar Evening')).toBeInTheDocument()
    expect(screen.getByText('2 × Standing')).toBeInTheDocument()
    expect(screen.getByText(/Payment: DEMO · succeeded · demo payment, no real money moved/)).toBeInTheDocument()
    expect(getAdminBooking).toHaveBeenCalledWith(55, expect.any(AbortSignal))
  })

  it('cancels only after a second confirmation that says what happens to tickets and payment', async () => {
    vi.mocked(cancelAdminBooking).mockResolvedValue(makeBooking({ status: 'CANCELLED', payment: { ...demoPaid, status: 'REFUNDED' } }))
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText(/tickets are voided and the demo payment is refunded/)).toBeInTheDocument()
    expect(cancelAdminBooking).not.toHaveBeenCalled() // the first click only asks "are you sure?"
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByText('The booking was cancelled.')).toBeInTheDocument()
    expect(cancelAdminBooking).toHaveBeenCalledWith(55)
    expect(screen.getByText('Cancelled', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
    expect(screen.getByText(/succeeded|refunded/i)).toBeInTheDocument()
  })

  it('explains that an unpaid booking only releases its held seats', async () => {
    vi.mocked(getAdminBooking).mockResolvedValue(makeBooking())
    renderAt()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancel booking' }))

    expect(screen.getByText(/held seats and tickets are released/)).toBeInTheDocument()
    expect(screen.getByText('Hold expires')).toBeInTheDocument()
  })

  it('shows the server\'s reason when cancelling is refused', async () => {
    vi.mocked(cancelAdminBooking).mockRejectedValue(new ApiError({ message: 'This booking can no longer be cancelled', status: 409 }))
    renderAt()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('can no longer be cancelled')
    expect(screen.getByText('Confirmed', { selector: 'span' })).toBeInTheDocument()
  })

  it('offers no cancel button for a booking that is already cancelled', async () => {
    vi.mocked(getAdminBooking).mockResolvedValue(makeBooking({ status: 'CANCELLED' }))
    renderAt()

    expect(await screen.findByText('Cancelled', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('shows "Booking not found" when the server says 404', async () => {
    vi.mocked(getAdminBooking).mockRejectedValue(new ApiError({ message: 'Booking not found', status: 404 }))
    renderAt('/admin/bookings/999')

    expect(await screen.findByRole('heading', { name: 'Booking not found' })).toBeInTheDocument()
  })
})