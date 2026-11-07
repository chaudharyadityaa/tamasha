import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBooking } from '../api/bookings'
import { ApiError } from '../api/errors'
import { getEvent } from '../api/events'
import { getSeatMap } from '../api/seats'
import { AuthContext } from '../auth/authContext'
import type { AuthContextValue } from '../auth/authContext'
import { authContext, loggedIn, makeBooking, makeReservedEvent, makeSeatMap } from '../test/fixtures'
import { SeatSelectionPage } from './SeatSelectionPage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))
vi.mock('../api/seats', () => ({ getSeatMap: vi.fn() }))
vi.mock('../api/bookings', () => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  payWithDemo: vi.fn(),
}))

function renderPage(auth: AuthContextValue = loggedIn()) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/events/7/seats']}>
        <Routes>
          <Route path="/events/:id/seats" element={<SeatSelectionPage />} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/bookings/:id" element={<p>booking page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const seat = (description: RegExp) => screen.findByRole('button', { name: description })

describe('SeatSelectionPage', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockReset().mockResolvedValue(makeReservedEvent())
    vi.mocked(getSeatMap).mockReset().mockResolvedValue(makeSeatMap())
    vi.mocked(createBooking).mockReset()
  })

  it('shows each section with every seat in its real state', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Choose your seats' })).toBeInTheDocument()
    expect(await seat(/VIP, row A, seat 1,.*available/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /VIP, row B, seat 1,.*held by another customer/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Balcony, row C, seat 2,.*already booked/ })).toBeInTheDocument()
    expect(getSeatMap).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('keeps a running total and enforces the per-section limit', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(await seat(/VIP, row A, seat 1,/))
    await user.click(screen.getByRole('button', { name: /VIP, row A, seat 2,/ }))

    expect(screen.getByText('2 seats selected')).toBeInTheDocument()
    expect(screen.getByText(/5,000/)).toBeInTheDocument()
    // VIP allows 2 seats per booking, so the third is now locked.
    expect(screen.getByRole('button', { name: /VIP, row A, seat 3,/ })).toHaveAccessibleName(/selection limit reached/)
  })

  it('reserves the selected seats with an idempotency key and opens the booking page', async () => {
    vi.mocked(createBooking).mockResolvedValue(makeBooking({ id: 55 }))
    renderPage()
    const user = userEvent.setup()

    await user.click(await seat(/VIP, row A, seat 1,/))
    await user.click(screen.getByRole('button', { name: /VIP, row A, seat 2,/ }))
    await user.click(screen.getByRole('button', { name: 'Reserve seats' }))

    expect(await screen.findByText('booking page')).toBeInTheDocument()
    expect(createBooking).toHaveBeenCalledWith(
      { eventId: 7, seatIds: [101, 102] },
      expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/),
    )
  })

  it('sends anonymous visitors to the login page when they try to reserve', async () => {
    renderPage(authContext())
    const user = userEvent.setup()

    await user.click(await seat(/VIP, row A, seat 1,/))
    await user.click(screen.getByRole('button', { name: 'Log in to book' }))

    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('explains a conflict, refreshes the map and drops the seat someone else took', async () => {
    const afterConflict = makeSeatMap()
    afterConflict.sections[0]!.seats[0]!.status = 'HELD' // somebody else grabbed A1
    vi.mocked(getSeatMap).mockReset().mockResolvedValueOnce(makeSeatMap()).mockResolvedValue(afterConflict)
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError({ message: 'These seats are no longer available: VIP A1', status: 409 }),
    )
    renderPage()
    const user = userEvent.setup()

    await user.click(await seat(/VIP, row A, seat 1,/))
    await user.click(screen.getByRole('button', { name: 'Reserve seats' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('These seats are no longer available: VIP A1')
    expect(await seat(/VIP, row A, seat 1,.*held by another customer/)).toBeInTheDocument()
    expect(getSeatMap).toHaveBeenCalledTimes(2)
    expect(screen.getByText('No seats selected yet.')).toBeInTheDocument()
  })

  it('explains when the event has no reserved seating', async () => {
    vi.mocked(getSeatMap).mockRejectedValue(new ApiError({ message: 'This event does not use reserved seating', status: 400 }))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'This event does not use seat selection' })).toBeInTheDocument()
  })

  it('shows "Event not found" when the server says 404', async () => {
    vi.mocked(getSeatMap).mockRejectedValue(new ApiError({ message: 'Event not found', status: 404 }))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
  })
})