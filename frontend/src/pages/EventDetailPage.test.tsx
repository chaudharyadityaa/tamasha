import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getEvent } from '../api/events'
import type { EventDetail } from '../api/types'
import { EventDetailPage } from './EventDetailPage'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))

const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()

const detail: EventDetail = {
  id: 7,
  title: 'Sitar Evening',
  description: 'An evening of classical music.\nBring a friend.',
  category: 'MUSIC',
  imageUrl: null,
  startsAt: '2027-01-10T13:30:00Z',
  endsAt: '2027-01-10T16:30:00Z',
  seatingMode: 'GENERAL_ADMISSION',
  currency: 'INR',
  cancellationCutoffHours: 24,
  organizerName: 'Asha Events',
  venue: {
    name: 'City Hall',
    addressLine: '1 Main Road',
    city: 'Agra',
    region: null,
    country: 'India',
    timeZone: 'Asia/Kolkata',
  },
  ticketTypes: [
    { id: 1, name: 'Standing', price: 499.5, quantityRemaining: 0, seatSection: null, maxPerBooking: 4, salesStart: null, salesEnd: null, onSale: true },
    { id: 2, name: 'Front row', price: 1500, quantityRemaining: 5, seatSection: null, maxPerBooking: 2, salesStart: null, salesEnd: null, onSale: true },
    { id: 3, name: 'Early bird', price: 300, quantityRemaining: 40, seatSection: null, maxPerBooking: 4, salesStart: inFiveDays, salesEnd: null, onSale: false },
  ],
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getEvent).mockReset()
  })

  it('shows the event, the venue, the organizer and each ticket type with its availability', async () => {
    vi.mocked(getEvent).mockResolvedValue(detail)
    renderAt('/events/7')

    expect(await screen.findByRole('heading', { name: 'Sitar Evening' })).toBeInTheDocument()
    expect(screen.getByText('City Hall')).toBeInTheDocument()
    expect(screen.getByText('Organized by Asha Events')).toBeInTheDocument()
    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.getByText('Only 5 left')).toBeInTheDocument()
    expect(screen.getByText(/Paid bookings can be cancelled up to 24 hours/)).toBeInTheDocument()
    expect(getEvent).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it('tells people when sales for a ticket type have not opened yet', async () => {
    vi.mocked(getEvent).mockResolvedValue(detail)
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