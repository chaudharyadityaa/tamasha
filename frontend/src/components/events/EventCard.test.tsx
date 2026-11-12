import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { EventSummary } from '../../api/types'
import { EventCard } from './EventCard'

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

function renderCard(event: EventSummary) {
  return render(
    <MemoryRouter>
      <ul>
        <EventCard event={event} />
      </ul>
    </MemoryRouter>,
  )
}

describe('EventCard', () => {
  it('shows the title, venue, price and links to the event page', () => {
    renderCard(jazz)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/1')
    expect(screen.getByText('Jazz Night')).toBeInTheDocument()
    expect(screen.getByText('City Hall, Agra')).toBeInTheDocument()
    expect(screen.getByText(/From .*500/)).toBeInTheDocument()
    expect(screen.getByText('MUSIC')).toBeInTheDocument()
  })

  it('shows a calendar stamp and the time at the venue', () => {
    renderCard(jazz)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText(/Sun, 7:00/)).toBeInTheDocument()
  })

  it('draws its own poster when there is no image, and uses the image when there is one', () => {
    const { container, unmount } = renderCard(jazz)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    unmount()

    const withImage = renderCard({ ...jazz, imageUrl: 'https://example.com/jazz.png' })
    expect(withImage.container.querySelector('img')).toHaveAttribute('src', 'https://example.com/jazz.png')
  })

  it('says Free or Price on request when there is no price to show', () => {
    const { unmount } = renderCard({ ...jazz, startingPrice: 0 })
    expect(screen.getByText('Free')).toBeInTheDocument()
    unmount()

    renderCard({ ...jazz, startingPrice: null })
    expect(screen.getByText('Price on request')).toBeInTheDocument()
  })
})