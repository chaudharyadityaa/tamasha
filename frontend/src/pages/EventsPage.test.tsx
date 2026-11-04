import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { searchEvents } from '../api/events'
import type { EventSummary, PageResponse } from '../api/types'
import { EventsPage } from './EventsPage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))

const jazz: EventSummary = {
  id: 1,
  title: 'Jazz Night',
  category: 'MUSIC',
  imageUrl: null,
  startsAt: '2027-01-10T13:30:00Z',
  endsAt: '2027-01-10T16:30:00Z',
  venueName: 'City Hall',
  city: 'Agra',
  timeZone: 'Asia/Kolkata',
  startingPrice: 500,
  currency: 'INR',
}

function resultPage(events: EventSummary[], totalElements = events.length, totalPages = 1, page = 0): PageResponse<EventSummary> {
  return { content: events, page, size: 12, totalElements, totalPages }
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <EventsPage />
    </MemoryRouter>,
  )
}

describe('EventsPage', () => {
  beforeEach(() => {
    vi.mocked(searchEvents).mockReset()
  })

  it('asks the API for what the URL describes and shows the events and pagination', async () => {
    vi.mocked(searchEvents).mockResolvedValue(resultPage([jazz], 30, 3, 1))
    renderAt('/events?q=jazz&page=2')

    expect(await screen.findByText('Jazz Night')).toBeInTheDocument()
    expect(searchEvents).toHaveBeenCalledWith(expect.objectContaining({ q: 'jazz', page: 1, size: 12 }), expect.any(AbortSignal))
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByText('Showing 13–13 of 30 events')).toBeInTheDocument()
  })

  it('applies the filters from the form', async () => {
    vi.mocked(searchEvents).mockResolvedValue(resultPage([jazz]))
    renderAt('/events')
    await screen.findByText('Jazz Night')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('City'), 'Agra')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() =>
      expect(searchEvents).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Agra', page: 0 }), expect.anything()),
    )
  })

  it('explains an empty result and offers to clear the filters', async () => {
    vi.mocked(searchEvents).mockResolvedValue(resultPage([], 0, 0))
    renderAt('/events?q=nothing')

    expect(await screen.findByText('No events match your search.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clear filters' }).length).toBeGreaterThan(0)
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(searchEvents)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(resultPage([jazz]))
    renderAt('/events')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Jazz Night')).toBeInTheDocument()
  })
})