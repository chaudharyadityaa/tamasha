import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderPage() {
  return render(
    <AuthContext.Provider value={authContext()}>
      <MemoryRouter initialEntries={['/events/7']}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('EventDetailPage header', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockReset()
  })

  it('draws the event its own poster when it has no image', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ imageUrl: null }))
    const { container } = renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Sitar Evening' })
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg[viewBox="0 0 400 500"]')).not.toBeNull()
  })

  it('uses the organizer\'s image when there is one', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ imageUrl: 'https://example.com/sitar.png' }))
    const { container } = renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Sitar Evening' })
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/sitar.png')
  })

  it('shows the venue address, a map link and the ticket panel', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeEvent())
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Sitar Evening' })
    expect(screen.getByRole('heading', { name: 'Where' })).toBeInTheDocument()
    expect(screen.getByText('1 Main Road, Agra, India')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open in Maps/ })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('City Hall, 1 Main Road, Agra, India')),
    )
    expect(screen.getByRole('complementary')).toHaveTextContent('Tickets')
  })
})