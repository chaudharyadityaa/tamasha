import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { searchEvents } from '../api/events'
import type { EventSummary, PageResponse } from '../api/types'
import { AuthContext } from '../auth/authContext'
import type { AuthContextValue } from '../auth/authContext'
import { authContext, customer, loggedIn } from '../test/fixtures'
import { HomePage } from './HomePage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))

const jazz: EventSummary = {
  id: 1,
  title: 'Jazz Night',
  category: 'Music',
  imageUrl: null,
  startsAt: '2027-01-10T13:30:00Z',
  endsAt: '2027-01-10T16:30:00Z',
  venueName: 'City Hall',
  city: 'Agra',
  timeZone: 'Asia/Kolkata',
  startingPrice: 500,
  currency: 'INR',
}

const resultPage = (events: EventSummary[]): PageResponse<EventSummary> => ({
  content: events,
  page: 0,
  size: 8,
  totalElements: events.length,
  totalPages: 1,
})

function EventsEcho() {
  const location = useLocation()
  return <p>events page {location.search}</p>
}

function renderHome(auth: AuthContextValue = authContext()) {
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsEcho />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(searchEvents).mockReset().mockResolvedValue(resultPage([jazz]))
  })

  it('opens with a headline and a search box', async () => {
    renderHome()

    expect(screen.getByRole('heading', { level: 1, name: 'Your next night out starts here.' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search events by name' })).toBeInTheDocument()
    await screen.findByRole('region', { name: 'Upcoming events' })
  })

  it('takes a search to the events page', async () => {
    renderHome()
    const user = userEvent.setup()

    await user.type(screen.getByRole('searchbox', { name: 'Search events by name' }), 'jazz{Enter}')

    expect(await screen.findByText('events page ?q=jazz')).toBeInTheDocument()
  })

  it('links every kind of night to the events page filtered by it', () => {
    renderHome()

    const comedyLinks = screen.getAllByRole('link', { name: 'Comedy' })
    expect(comedyLinks).toHaveLength(2) // the quick link in the hero and the poster tile
    for (const link of comedyLinks) {
      expect(link).toHaveAttribute('href', '/events?category=Comedy')
    }
  })

  it('shows the upcoming events from the server in a scrolling rail', async () => {
    renderHome()

    const rail = await screen.findByRole('region', { name: 'Upcoming events' })
    expect(within(rail).getByText('Jazz Night')).toBeInTheDocument()
    expect(searchEvents).toHaveBeenCalledWith({ size: 8, sort: 'date' }, expect.any(AbortSignal))
  })

  it('says so when there are no upcoming events', async () => {
    vi.mocked(searchEvents).mockResolvedValue(resultPage([]))
    renderHome()

    expect(await screen.findByText(/No upcoming events yet/)).toBeInTheDocument()
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(searchEvents)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(resultPage([jazz]))
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('region', { name: 'Upcoming events' })).toBeInTheDocument()
  })

  it('invites visitors to create an account, and organizers to open their dashboard', async () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    await screen.findByRole('region', { name: 'Upcoming events' })
  })

  it('sends a signed-in organizer to the dashboard', async () => {
    renderHome(authContext({ status: 'authenticated', user: { ...customer, role: 'ORGANIZER' } }))

    expect(screen.getByRole('link', { name: 'Open your dashboard' })).toHaveAttribute('href', '/organizer')
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
    await screen.findByRole('region', { name: 'Upcoming events' })
  })

  it('shows a customer no organizer button', async () => {
    renderHome(loggedIn())

    expect(screen.getByRole('heading', { name: 'Hosting a night of your own?' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open your dashboard' })).not.toBeInTheDocument()
    await screen.findByRole('region', { name: 'Upcoming events' })
  })
})