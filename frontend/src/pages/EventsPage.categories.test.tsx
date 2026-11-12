import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchEvents } from '../api/events'
import type { PageResponse } from '../api/types'
import type { EventSummary } from '../api/types'
import { EventsPage } from './EventsPage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))

const empty: PageResponse<EventSummary> = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 }

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <EventsPage />
    </MemoryRouter>,
  )
  return screen.getByRole('navigation', { name: 'Kinds of event' })
}

describe('EventsPage kinds of event', () => {
  beforeEach(() => {
    vi.mocked(searchEvents).mockReset().mockResolvedValue(empty)
  })

  it('offers one link per kind of event, plus All, and marks All as current when nothing is filtered', async () => {
    const nav = renderAt('/events')

    expect(nav.querySelectorAll('a')).toHaveLength(7)
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('href', '/events?category=Music')
    await screen.findByText('No events match your search.')
  })

  it('keeps the other filters when a kind of event is chosen, and drops the category for All', async () => {
    renderAt('/events?q=jazz&category=Comedy')

    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('href', '/events?q=jazz&category=Music')
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/events?q=jazz')
    await screen.findByText('No events match your search.')
  })

  it('marks the chosen kind as current, whatever its capitalisation in the URL', async () => {
    renderAt('/events?category=music')

    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
    await screen.findByText('No events match your search.')
  })

  it('shows placeholders while the first results are loading', async () => {
    vi.mocked(searchEvents).mockReturnValue(new Promise(() => undefined))
    renderAt('/events')

    expect(screen.getByRole('status')).toHaveTextContent('Loading events')
  })
})