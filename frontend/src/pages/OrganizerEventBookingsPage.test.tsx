import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getOrganizerEvent } from '../api/organizer'
import { listEventBookings } from '../api/organizerOperations'
import { makeOrganizerEvent, pageOf } from '../test/organizerFixtures'
import { makeBookingRow } from '../test/organizerOpsFixtures'
import { OrganizerEventBookingsPage } from './OrganizerEventBookingsPage'

vi.mock('../api/organizer', () => ({ getOrganizerEvent: vi.fn() }))
vi.mock('../api/organizerOperations', () => ({
  getVenue: vi.fn(),
  createSeatBlock: vi.fn(),
  deleteSeatSection: vi.fn(),
  getEventStats: vi.fn(),
  listEventBookings: vi.fn(),
  checkInTicket: vi.fn(),
  getAttendance: vi.fn(),
}))

function renderAt(path = '/organizer/events/7/bookings') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/:id/bookings" element={<OrganizerEventBookingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrganizerEventBookingsPage', () => {
  beforeEach(() => {
    vi.mocked(getOrganizerEvent).mockReset().mockResolvedValue(makeOrganizerEvent())
    vi.mocked(listEventBookings).mockReset().mockResolvedValue(pageOf([makeBookingRow()]))
  })

  it('lists the bookings with customer, status and total', async () => {
    renderAt()

    expect(await screen.findByText('EH-ROW0000001')).toBeInTheDocument()
    expect(screen.getByText('Ana Rao')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText(/999/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sitar Evening' })).toHaveAttribute('href', '/organizer/events/7')
    expect(listEventBookings).toHaveBeenCalledWith(7, { page: 0, size: 20 }, expect.any(AbortSignal))
  })

  it('says so when there are no bookings', async () => {
    vi.mocked(listEventBookings).mockResolvedValue(pageOf([], 0, 0))
    renderAt()

    expect(await screen.findByText('No bookings for this event yet.')).toBeInTheDocument()
  })

  it('pages through a long list', async () => {
    vi.mocked(listEventBookings).mockResolvedValue(pageOf([makeBookingRow()], 45, 3))
    renderAt()
    await screen.findByText('EH-ROW0000001')

    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }))

    await screen.findByText('EH-ROW0000001')
    expect(listEventBookings).toHaveBeenLastCalledWith(7, { page: 1, size: 20 }, expect.anything())
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(listEventBookings)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(pageOf([makeBookingRow()]))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('EH-ROW0000001')).toBeInTheDocument()
  })
})