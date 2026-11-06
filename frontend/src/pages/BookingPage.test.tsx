import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelBooking, getBooking, payWithDemo } from '../api/bookings'
import { ApiError } from '../api/errors'
import { makeBooking } from '../test/fixtures'
import { BookingPage } from './BookingPage'

vi.mock('../api/bookings', () => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  payWithDemo: vi.fn(),
}))

function renderPage(path = '/bookings/55') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bookings/:id" element={<BookingPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const demoPaid = { provider: 'DEMO', status: 'SUCCEEDED' as const, demo: true }

describe('BookingPage', () => {
  beforeEach(() => {
    vi.mocked(getBooking).mockReset()
    vi.mocked(payWithDemo).mockReset()
    vi.mocked(cancelBooking).mockReset()
  })

  it('shows the hold countdown and a clearly labeled demo payment', async () => {
    vi.mocked(getBooking).mockResolvedValue(makeBooking())
    renderPage()

    expect(await screen.findByText(/Time left to pay/)).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/\d+:\d{2}/)
    expect(screen.getByText(/No real money is charged/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pay .* \(demo\)/i })).toBeInTheDocument()
    expect(getBooking).toHaveBeenCalledWith(55, expect.any(AbortSignal))
  })

  it('pays with the demo payment and shows the confirmation', async () => {
    vi.mocked(getBooking).mockResolvedValue(makeBooking())
    vi.mocked(payWithDemo).mockResolvedValue(makeBooking({ status: 'CONFIRMED', payment: demoPaid }))
    renderPage()

    await userEvent.setup().click(await screen.findByRole('button', { name: /pay .* \(demo\)/i }))

    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument()
    expect(payWithDemo).toHaveBeenCalledWith(55)
    expect(screen.getByText(/Paid with a demo payment/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay .* \(demo\)/i })).not.toBeInTheDocument()
  })

  it('explains why a payment failed', async () => {
    vi.mocked(getBooking).mockResolvedValue(makeBooking())
    vi.mocked(payWithDemo).mockRejectedValue(
      new ApiError({ message: 'The hold on this booking has expired. Please book again.', status: 409 }),
    )
    renderPage()

    await userEvent.setup().click(await screen.findByRole('button', { name: /pay .* \(demo\)/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The hold on this booking has expired')
  })

  it('cancels only after a second, explicit confirmation', async () => {
    vi.mocked(getBooking).mockResolvedValue(makeBooking())
    vi.mocked(cancelBooking).mockResolvedValue(makeBooking({ status: 'CANCELLED' }))
    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(cancelBooking).not.toHaveBeenCalled() // the first click only asks "are you sure?"
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(cancelBooking).toHaveBeenCalledWith(55)
  })

  it('treats a hold whose time ran out as expired and removes the pay button', async () => {
    vi.mocked(getBooking).mockResolvedValue(
      makeBooking({ expiresAt: new Date(Date.now() - 60_000).toISOString() }),
    )
    renderPage()

    expect(await screen.findByText(/hold has expired/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument()
  })

  it('shows a confirmed booking with its payment note', async () => {
    vi.mocked(getBooking).mockResolvedValue(makeBooking({ status: 'CONFIRMED', payment: demoPaid }))
    renderPage()

    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Paid with a demo payment/)).toBeInTheDocument()
  })

  it('shows "Booking not found" when the server answers 404', async () => {
    vi.mocked(getBooking).mockRejectedValue(new ApiError({ message: 'Booking not found', status: 404 }))
    renderPage('/bookings/999')

    expect(await screen.findByRole('heading', { name: 'Booking not found' })).toBeInTheDocument()
  })
})