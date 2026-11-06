import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getEvent } from '../api/events'
import { AuthContext } from '../auth/authContext'
import { authContext, makeEvent } from '../test/fixtures'
import { EventDetailPage } from './EventDetailPage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))
vi.mock('../api/bookings', () => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  payWithDemo: vi.fn(),
}))

function renderAt(path: string) {
  render(
    <AuthContext.Provider value={authContext()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockReset()
  })

  it('shows the event, the venue, the organizer and each ticket type with its availability', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeEvent())
    renderAt('/events/7')

    expect(await screen.findByRole('heading', { name: 'Sitar Evening' })).toBeInTheDocument()
    expect(screen.getByText('City Hall')).toBeInTheDocument()
    expect(screen.getByText('Organized by Asha Events')).toBeInTheDocument()
    expect(screen.getByText('Sold out', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Only 3 left')).toBeInTheDocument()
    expect(screen.getByText(/Paid bookings can be cancelled up to 24 hours/)).toBeInTheDocument()
    expect(getEvent).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('tells people when sales for a ticket type have not opened yet', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeEvent())
    renderAt('/events/7')

    expect(await screen.findByText(/Sales open/)).toBeInTheDocument()
  })

  it('shows "Event not found" when the server says 404', async () => {
    vi.mocked(getEvent).mockRejectedValue(new ApiError({ message: 'Event not found', status: 404 }))
    renderAt('/events/999')

    expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
  })

  it('does not call the API for an id that is not a number', () => {
    renderAt('/events/abc')

    expect(screen.getByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
    expect(getEvent).not.toHaveBeenCalled()
  })
})