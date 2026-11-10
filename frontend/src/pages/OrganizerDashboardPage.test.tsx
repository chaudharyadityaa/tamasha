import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { listOrganizerEvents } from '../api/organizer'
import { makeOrganizerEvent, pageOf } from '../test/organizerFixtures'
import { OrganizerDashboardPage } from './OrganizerDashboardPage'

vi.mock('../api/organizer', () => ({
  listOrganizerEvents: vi.fn(),
  getOrganizerEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listVenues: vi.fn(),
  createVenue: vi.fn(),
}))

function renderAt(url = '/organizer') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <OrganizerDashboardPage />
    </MemoryRouter>,
  )
}

describe('OrganizerDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(listOrganizerEvents).mockReset()
  })

  it('lists my events with their status, date at the venue and venue name', async () => {
    vi.mocked(listOrganizerEvents).mockResolvedValue(pageOf([makeOrganizerEvent(), makeOrganizerEvent({ id: 8, title: 'Jazz Night', status: 'PUBLISHED' })]))
    renderAt()

    expect(await screen.findByText('Sitar Evening')).toBeInTheDocument()
    // The status badges are spans; "Published" is also the name of a filter tab (a link), so name the badge.
    expect(screen.getByText('Draft', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Published', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getAllByText(/City Hall, Agra/)).toHaveLength(2)
    expect(screen.getAllByText(/10 Jan 2027/).length).toBeGreaterThan(0)
    expect(listOrganizerEvents).toHaveBeenCalledWith({ page: 0, size: 10 }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page')
  })

  it('filters by status when a tab is chosen', async () => {
    vi.mocked(listOrganizerEvents).mockResolvedValue(pageOf([makeOrganizerEvent()]))
    renderAt()
    await screen.findByText('Sitar Evening')

    await userEvent.setup().click(screen.getByRole('link', { name: 'Published' }))

    expect(await screen.findByRole('link', { name: 'Published' })).toHaveAttribute('aria-current', 'page')
    expect(listOrganizerEvents).toHaveBeenLastCalledWith({ page: 0, size: 10, status: 'PUBLISHED' }, expect.anything())
  })

  it('guides a new organizer who has no events yet', async () => {
    vi.mocked(listOrganizerEvents).mockResolvedValue(pageOf([], 0, 0))
    renderAt()

    expect(await screen.findByText('You have no events yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New event' })).toHaveAttribute('href', '/organizer/events/new')
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(listOrganizerEvents)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(pageOf([makeOrganizerEvent()]))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Sitar Evening')).toBeInTheDocument()
  })
})