import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { listSeatSections } from '../api/organizer'
import { createSeatBlock, deleteSeatSection, getVenue } from '../api/organizerOperations'
import { makeSeatSection, makeVenue } from '../test/organizerFixtures'
import { OrganizerSeatsPage } from './OrganizerSeatsPage'

vi.mock('../api/organizer', () => ({ listSeatSections: vi.fn() }))
vi.mock('../api/organizerOperations', () => ({
  getVenue: vi.fn(),
  createSeatBlock: vi.fn(),
  deleteSeatSection: vi.fn(),
  getEventStats: vi.fn(),
  listEventBookings: vi.fn(),
  checkInTicket: vi.fn(),
  getAttendance: vi.fn(),
}))

function renderAt(path = '/organizer/venues/1/seats') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/venues/:id/seats" element={<OrganizerSeatsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const sections = [makeSeatSection(), makeSeatSection({ section: 'Balcony', seatCount: 40, rowCount: 2 })]

describe('OrganizerSeatsPage', () => {
  beforeEach(() => {
    vi.mocked(getVenue).mockReset().mockResolvedValue(makeVenue())
    vi.mocked(listSeatSections).mockReset().mockResolvedValue(sections)
    vi.mocked(createSeatBlock).mockReset()
    vi.mocked(deleteSeatSection).mockReset()
  })

  it('lists the sections with their rows and seats, and the totals', async () => {
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Seats at City Hall' })).toBeInTheDocument()
    expect(await screen.findByText('30 seats · 3 rows')).toBeInTheDocument()
    expect(screen.getByText('40 seats · 2 rows')).toBeInTheDocument()
    expect(screen.getByText('Venue capacity 500 · 70 seats set up')).toBeInTheDocument()
    expect(listSeatSections).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  })

  it('explains an empty venue', async () => {
    vi.mocked(listSeatSections).mockResolvedValue([])
    renderAt()

    expect(await screen.findByText(/No seats yet/)).toBeInTheDocument()
  })

  it('previews, creates the seats and shows the refreshed list', async () => {
    vi.mocked(createSeatBlock).mockResolvedValue({ section: 'Gallery', rows: ['A', 'B', 'C'], seatsPerRow: 10, seatsCreated: 30 })
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('30 seats · 3 rows')

    await user.type(screen.getByLabelText('Section'), 'Gallery')
    await user.type(screen.getByLabelText('Rows'), 'A-C')
    await user.type(screen.getByLabelText('Seats per row'), '10')
    expect(screen.getByText('This will create 30 seats (3 rows × 10 seats).')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create seats' }))

    expect(await screen.findByText('Added 30 seats to section “Gallery”.')).toBeInTheDocument()
    expect(createSeatBlock).toHaveBeenCalledWith(1, { section: 'Gallery', rows: ['A', 'B', 'C'], seatsPerRow: 10 })
    expect(listSeatSections).toHaveBeenCalledTimes(2)
  })

  it('checks the form without calling the server', async () => {
    renderAt()
    await screen.findByText('30 seats · 3 rows')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Create seats' }))

    expect(screen.getByText('Enter a section name, for example VIP.')).toBeInTheDocument()
    expect(screen.getByText('Enter at least one row, for example A-F or A, B, C.')).toBeInTheDocument()
    expect(screen.getByText('Enter a whole number from 1 to 200.')).toBeInTheDocument()
    expect(createSeatBlock).not.toHaveBeenCalled()
  })

  it('shows the server\'s reason when creating seats is refused', async () => {
    vi.mocked(createSeatBlock).mockRejectedValue(new ApiError({ message: 'This would exceed the venue capacity', status: 409 }))
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('30 seats · 3 rows')

    await user.type(screen.getByLabelText('Section'), 'Gallery')
    await user.type(screen.getByLabelText('Rows'), 'A-C')
    await user.type(screen.getByLabelText('Seats per row'), '10')
    await user.click(screen.getByRole('button', { name: 'Create seats' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('exceed the venue capacity')
  })

  it('deletes a section only after a second, explicit confirmation', async () => {
    vi.mocked(deleteSeatSection).mockResolvedValue(undefined)
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('30 seats · 3 rows')

    await user.click(screen.getByRole('button', { name: 'Delete section VIP' }))
    expect(deleteSeatSection).not.toHaveBeenCalled() // the first click only asks "are you sure?"
    await user.click(screen.getByRole('button', { name: 'Yes, delete section' }))

    expect(await screen.findByText('Section “VIP” was deleted.')).toBeInTheDocument()
    expect(deleteSeatSection).toHaveBeenCalledWith(1, 'VIP')
    expect(listSeatSections).toHaveBeenCalledTimes(2)
  })

  it('shows the server\'s reason when a section cannot be deleted', async () => {
    vi.mocked(deleteSeatSection).mockRejectedValue(new ApiError({ message: 'A ticket type still sells this section', status: 409 }))
    renderAt()
    const user = userEvent.setup()
    await screen.findByText('30 seats · 3 rows')

    await user.click(screen.getByRole('button', { name: 'Delete section VIP' }))
    await user.click(screen.getByRole('button', { name: 'Yes, delete section' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('still sells this section')
    expect(screen.getByText('30 seats · 3 rows')).toBeInTheDocument()
  })

  it('shows "Venue not found" when the server says 404', async () => {
    vi.mocked(getVenue).mockRejectedValue(new ApiError({ message: 'Venue not found', status: 404 }))
    renderAt('/organizer/venues/999/seats')

    expect(await screen.findByRole('heading', { name: 'Venue not found' })).toBeInTheDocument()
  })
})