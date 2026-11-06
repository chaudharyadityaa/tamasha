import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBooking } from '../../api/bookings'
import { ApiError } from '../../api/errors'
import type { EventDetail } from '../../api/types'
import { AuthContext } from '../../auth/authContext'
import type { AuthContextValue } from '../../auth/authContext'
import { authContext, loggedIn, makeBooking, makeEvent } from '../../test/fixtures'
import { BookingPanel } from './BookingPanel'

vi.mock('../../api/bookings', () => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  payWithDemo: vi.fn(),
}))

function renderPanel(event: EventDetail, auth: AuthContextValue, onStale = vi.fn()) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/events/7']}>
        <Routes>
          <Route path="/events/:id" element={<BookingPanel event={event} onStale={onStale} />} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/bookings/:id" element={<p>booking page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return onStale
}

const increase = (ticket: string) => screen.getByRole('button', { name: `Increase ${ticket} quantity` })

describe('BookingPanel', () => {
  beforeEach(() => {
    vi.mocked(createBooking).mockReset()
  })

  it('sends anonymous visitors to the login page', async () => {
    renderPanel(makeEvent(), authContext())
    const user = userEvent.setup()

    await user.click(increase('Standing'))
    await user.click(screen.getByRole('button', { name: 'Log in to book' }))

    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('reserves the chosen tickets with an idempotency key and opens the booking page', async () => {
    vi.mocked(createBooking).mockResolvedValue(makeBooking({ id: 55 }))
    renderPanel(makeEvent(), loggedIn())
    const user = userEvent.setup()

    await user.click(increase('Standing'))
    await user.click(increase('Standing'))
    expect(screen.getByText(/2 tickets/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reserve tickets' }))

    expect(await screen.findByText('booking page')).toBeInTheDocument()
    expect(createBooking).toHaveBeenCalledWith(
      { eventId: 7, items: [{ ticketTypeId: 1, quantity: 2 }] },
      expect.stringMatching(/^[A-Za-z0-9_-]{8,64}$/),
    )
  })

  it('offers no quantity control for sold-out tickets or tickets not yet on sale', () => {
    renderPanel(makeEvent(), loggedIn())

    expect(increase('Standing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Increase Sold out quantity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Increase Early bird quantity' })).not.toBeInTheDocument()
  })

  it('stops at the per-booking limit', async () => {
    renderPanel(makeEvent(), loggedIn())
    const user = userEvent.setup()

    await user.click(increase('VIP'))
    await user.click(increase('VIP'))
    await user.click(increase('VIP')) // a third click does nothing: the limit is 2

    expect(within(screen.getByRole('group', { name: 'VIP quantity' })).getByText('2')).toBeInTheDocument()
    expect(increase('VIP')).toBeDisabled()
  })

  it('shows the server message and refreshes availability when tickets just sold out', async () => {
    vi.mocked(createBooking).mockRejectedValue(
      new ApiError({ message: "Not enough 'Standing' tickets left", status: 409 }),
    )
    const onStale = renderPanel(makeEvent(), loggedIn())
    const user = userEvent.setup()

    await user.click(increase('Standing'))
    await user.click(screen.getByRole('button', { name: 'Reserve tickets' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Not enough 'Standing' tickets left")
    expect(onStale).toHaveBeenCalled()
  })

  it('asks for at least one ticket before calling the server', async () => {
    renderPanel(makeEvent(), loggedIn())

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reserve tickets' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose at least one ticket.')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('tells people that seat selection is coming for reserved-seating events', () => {
    renderPanel(makeEvent({ seatingMode: 'RESERVED_SEATING' }), loggedIn())

    expect(screen.getByRole('button', { name: 'Choose seats' })).toBeDisabled()
    expect(screen.getByText('Seat selection arrives in the next update.')).toBeInTheDocument()
  })
})