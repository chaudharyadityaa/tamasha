import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEvent, getOrganizerEvent, listVenues, updateEvent } from '../api/organizer'
import { makeOrganizerEvent, makeVenue, pageOf } from '../test/organizerFixtures'
import { OrganizerEventFormPage } from './OrganizerEventFormPage'

vi.mock('../api/organizer', () => ({
  listOrganizerEvents: vi.fn(),
  getOrganizerEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listVenues: vi.fn(),
  createVenue: vi.fn(),
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/new" element={<OrganizerEventFormPage mode="create" />} />
        <Route path="/organizer/events/:id/edit" element={<OrganizerEventFormPage mode="edit" />} />
        <Route path="/organizer/events/:id" element={<p>event page</p>} />
        <Route path="/organizer" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OrganizerEventFormPage', () => {
  beforeEach(() => {
    vi.mocked(listVenues).mockReset().mockResolvedValue(pageOf([makeVenue()]))
    vi.mocked(createEvent).mockReset()
    vi.mocked(updateEvent).mockReset()
    vi.mocked(getOrganizerEvent).mockReset()
  })

  it('creates an event, converting the venue-local times to UTC', async () => {
    vi.mocked(createEvent).mockResolvedValue(makeOrganizerEvent({ id: 12 }))
    renderAt('/organizer/events/new')
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Venue'), '1')
    await user.type(screen.getByLabelText('Title'), 'Sitar Evening')
    await user.type(screen.getByLabelText('Category'), 'Music')
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2027-01-10T19:00' } })
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2027-01-10T22:00' } })
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('event page')).toBeInTheDocument()
    expect(createEvent).toHaveBeenCalledWith({
      venueId: 1,
      title: 'Sitar Evening',
      category: 'Music',
      startsAt: '2027-01-10T13:30:00.000Z',
      endsAt: '2027-01-10T16:30:00.000Z',
      seatingMode: 'GENERAL_ADMISSION',
      currency: 'INR',
      cancellationCutoffHours: 24,
    })
  })

  it('refuses an end time that is not after the start without calling the server', async () => {
    renderAt('/organizer/events/new')
    const user = userEvent.setup()

    await user.selectOptions(await screen.findByLabelText('Venue'), '1')
    await user.type(screen.getByLabelText('Title'), 'Sitar Evening')
    await user.type(screen.getByLabelText('Category'), 'Music')
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2027-01-10T19:00' } })
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2027-01-10T18:00' } })
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(await screen.findByText('The end must be after the start.')).toBeInTheDocument()
    expect(createEvent).not.toHaveBeenCalled()
  })

  it('asks for a venue first when there are none', async () => {
    vi.mocked(listVenues).mockResolvedValue(pageOf([], 0, 0))
    renderAt('/organizer/events/new')

    expect(await screen.findByText('You need a venue first.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a venue' })).toHaveAttribute('href', '/organizer/venues')
  })

  it('edits an event: shows the times as they read at the venue and saves the changes in UTC', async () => {
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent())
    vi.mocked(updateEvent).mockResolvedValue(makeOrganizerEvent({ title: 'Sitar Night' }))
    renderAt('/organizer/events/7/edit')
    const user = userEvent.setup()

    const title = await screen.findByDisplayValue('Sitar Evening')
    expect(screen.getByLabelText('Starts')).toHaveValue('2027-01-10T19:00')
    expect(screen.getByLabelText('Ends')).toHaveValue('2027-01-10T22:00')
    await user.clear(title)
    await user.type(title, 'Sitar Night')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('event page')).toBeInTheDocument()
    expect(updateEvent).toHaveBeenCalledWith(7, {
      title: 'Sitar Night',
      description: 'An evening of classical music.',
      category: 'Music',
      startsAt: '2027-01-10T13:30:00.000Z',
      endsAt: '2027-01-10T16:30:00.000Z',
      cancellationCutoffHours: 24,
    })
  })

  it('does not allow editing a cancelled event', async () => {
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'CANCELLED' }))
    renderAt('/organizer/events/7/edit')

    expect(await screen.findByText('Cancelled events cannot be edited.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })
})