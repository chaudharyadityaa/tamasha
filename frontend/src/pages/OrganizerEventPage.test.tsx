import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getOrganizerEvent } from '../api/organizer'
import { makeOrganizerEvent } from '../test/organizerFixtures'
import { OrganizerEventPage } from './OrganizerEventPage'

vi.mock('../api/organizer', () => ({
  listOrganizerEvents: vi.fn(),
  getOrganizerEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listVenues: vi.fn(),
  createVenue: vi.fn(),
}))

function renderAt(path = '/organizer/events/7') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/:id" element={<OrganizerEventPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrganizerEventPage', () => {
  beforeEach(() => {
    vi.mocked(getOrganizerEvent).mockReset()
  })

  it('shows a draft with its schedule at the venue and an edit link', async () => {
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent())
    renderAt()

    expect(await screen.findByRole('heading', { name: 'Sitar Evening' })).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText(/7:00 pm – 10:00 pm/)).toBeInTheDocument()
    expect(screen.getByText('City Hall')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute('href', '/organizer/events/7/edit')
    expect(screen.queryByRole('link', { name: 'View public page' })).not.toBeInTheDocument()
    expect(getOrganizerEvent).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('links a published event to its public page', async () => {
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
    renderAt()

    expect(await screen.findByRole('link', { name: 'View public page' })).toHaveAttribute('href', '/events/7')
  })

  it('offers no editing for a cancelled event', async () => {
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'CANCELLED' }))
    renderAt()

    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument()
  })

  it('shows "Event not found" when the server says 404', async () => {
    vi.mocked(getOrganizerEvent).mockRejectedValue(new ApiError({ message: 'Event not found', status: 404 }))
    renderAt('/organizer/events/999')

    expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
  })
})