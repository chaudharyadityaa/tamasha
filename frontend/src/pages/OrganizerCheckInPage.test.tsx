import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getOrganizerEvent } from '../api/organizer'
import { checkInTicket, getAttendance } from '../api/organizerOperations'
import { makeOrganizerEvent } from '../test/organizerFixtures'
import { makeAttendance, makeCheckInResult } from '../test/organizerOpsFixtures'
import { OrganizerCheckInPage } from './OrganizerCheckInPage'

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

function renderAt(path = '/organizer/events/7/check-in') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/:id/check-in" element={<OrganizerCheckInPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const codeField = () => screen.getByLabelText('Ticket code')

describe('OrganizerCheckInPage', () => {
  beforeEach(() => {
    vi.mocked(getOrganizerEvent).mockReset().mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
    vi.mocked(getAttendance).mockReset().mockResolvedValue(makeAttendance())
    vi.mocked(checkInTicket).mockReset()
  })

  it('shows the event and who has arrived so far', async () => {
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Check-in' })).toBeInTheDocument()
    expect(await screen.findByText(/Sitar Evening/)).toBeInTheDocument()
    expect(await screen.findByText('3 of 10 checked in')).toBeInTheDocument()
    expect(screen.getByText('6 not yet arrived · 1 cancelled tickets')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Checked in' })).toHaveAttribute('aria-valuenow', '30')
    expect(getAttendance).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('admits the holder, refreshes the attendance and gets ready for the next scan', async () => {
    vi.mocked(checkInTicket).mockResolvedValue(makeCheckInResult())
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('3 of 10 checked in')

    await user.type(codeField(), 'TK-ABC123{Enter}')

    expect(await screen.findAllByText('Admitted')).not.toHaveLength(0)
    expect(screen.getAllByText('Ana Rao · VIP · VIP · Row A · Seat 3').length).toBeGreaterThan(0)
    expect(checkInTicket).toHaveBeenCalledWith(7, 'TK-ABC123')
    await waitFor(() => expect(getAttendance).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(codeField()).toHaveValue(''))
    expect(codeField()).toHaveFocus()
  })

  it('shows the server\'s reason when a ticket is refused', async () => {
    vi.mocked(checkInTicket).mockRejectedValue(new ApiError({ message: 'This ticket was already used at 19:41', status: 409 }))
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('3 of 10 checked in')

    await user.type(codeField(), 'TK-USED{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Not admitted')
    expect(alert).toHaveTextContent('already used at 19:41')
    expect(screen.getByText('Recent scans')).toBeInTheDocument()
  })

  it('says plainly when the code does not belong to this event', async () => {
    vi.mocked(checkInTicket).mockRejectedValue(new ApiError({ message: 'Not found', status: 404 }))
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('3 of 10 checked in')

    await user.type(codeField(), 'TK-NOPE{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('No ticket with this code was found for this event.')
  })

  it('asks for a code without calling the server', async () => {
    renderAt()
    await screen.findByText('3 of 10 checked in')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Check in' }))

    expect(screen.getByText('Enter or scan a ticket code.')).toBeInTheDocument()
    expect(checkInTicket).not.toHaveBeenCalled()
  })

  it('keeps the typed code after a network failure so staff can try again', async () => {
    vi.mocked(checkInTicket).mockRejectedValue(new ApiError({ message: 'Network error', isNetworkError: true }))
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('3 of 10 checked in')

    await user.type(codeField(), 'TK-RETRY{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(codeField()).toHaveValue('TK-RETRY')
  })

  it('shows "Event not found" when the server says 404', async () => {
    vi.mocked(getOrganizerEvent).mockRejectedValue(new ApiError({ message: 'Event not found', status: 404 }))
    renderAt('/organizer/events/999/check-in')

    expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
  })
})