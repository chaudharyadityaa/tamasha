import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { BookingSummary } from '../../api/bookingTypes'
import { makeSummary } from '../../test/ticketFixtures'
import { BookingSummaryCard } from './BookingSummaryCard'

function renderCard(booking: BookingSummary) {
  return render(
    <MemoryRouter>
      <ul>
        <BookingSummaryCard booking={booking} />
      </ul>
    </MemoryRouter>,
  )
}

describe('BookingSummaryCard', () => {
  it('shows the event, the reference, the status and the total, with a calendar stamp', () => {
    const { container } = renderCard(makeSummary())

    expect(screen.getByRole('link', { name: 'Symphony Night' })).toHaveAttribute('href', '/bookings/9')
    expect(screen.getByText('EH-SUMMARY001')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText(/5,000/)).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).not.toBe('')
  })

  it('links a paid booking to its tickets', () => {
    renderCard(makeSummary({ id: 9, status: 'CONFIRMED' }))

    expect(screen.getByRole('link', { name: 'View tickets' })).toHaveAttribute('href', '/bookings/9/tickets')
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute('href', '/bookings/9')
  })

  it('sends an unpaid booking to payment and offers no tickets', () => {
    renderCard(makeSummary({ id: 10, status: 'PENDING_PAYMENT', totalAmount: 0 }))

    expect(screen.getByRole('link', { name: 'Complete payment' })).toHaveAttribute('href', '/bookings/10')
    expect(screen.queryByRole('link', { name: 'View tickets' })).not.toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })
})