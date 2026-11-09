import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listMyBookings } from '../api/bookings'
import type { BookingSummary } from '../api/bookingTypes'
import { ApiError } from '../api/errors'
import type { PageResponse } from '../api/types'
import { makeSummary } from '../test/ticketFixtures'
import { MyBookingsPage } from './MyBookingsPage'

vi.mock('../api/bookings', () => ({ listMyBookings: vi.fn() }))

function resultPage(content: BookingSummary[], totalElements = content.length, totalPages = 1, page = 0): PageResponse<BookingSummary> {
  return { content, page, size: 10, totalElements, totalPages }
}

function renderAt(url = '/my-bookings') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <MyBookingsPage />
    </MemoryRouter>,
  )
}

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.mocked(listMyBookings).mockReset()
  })

  it('shows upcoming bookings by default, asking the API for that bucket', async () => {
    vi.mocked(listMyBookings).mockResolvedValue(resultPage([makeSummary()]))
    renderAt()

    expect(await screen.findByText('Symphony Night')).toBeInTheDocument()
    expect(screen.getByText('EH-SUMMARY001')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(listMyBookings).toHaveBeenCalledWith({ bucket: 'upcoming', page: 0, size: 10 }, expect.any(AbortSignal))
    expect(screen.getByRole('link', { name: 'Upcoming' })).toHaveAttribute('aria-current', 'page')
  })

  it('switches tabs, which changes what is requested', async () => {
    vi.mocked(listMyBookings).mockResolvedValue(resultPage([makeSummary()]))
    renderAt()
    await screen.findByText('Symphony Night')

    await userEvent.setup().click(screen.getByRole('link', { name: 'Past' }))

    expect(await screen.findByRole('link', { name: 'Past' })).toHaveAttribute('aria-current', 'page')
    expect(listMyBookings).toHaveBeenLastCalledWith({ bucket: 'past', page: 0, size: 10 }, expect.anything())
  })

  it('explains an empty tab', async () => {
    vi.mocked(listMyBookings).mockResolvedValue(resultPage([], 0, 0))
    renderAt('/my-bookings?tab=cancelled')

    expect(await screen.findByText('No cancelled or expired bookings.')).toBeInTheDocument()
    expect(listMyBookings).toHaveBeenCalledWith({ bucket: 'cancelled', page: 0, size: 10 }, expect.anything())
  })

  it('pages through long lists', async () => {
    vi.mocked(listMyBookings).mockResolvedValue(resultPage([makeSummary()], 25, 3))
    renderAt()
    await screen.findByText('Symphony Night')

    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }))

    await screen.findByText('Symphony Night')
    expect(listMyBookings).toHaveBeenLastCalledWith({ bucket: 'upcoming', page: 1, size: 10 }, expect.anything())
  })

  it('links paid bookings to their tickets and unpaid ones to payment', async () => {
    vi.mocked(listMyBookings).mockResolvedValue(
      resultPage([
        makeSummary({ id: 9, status: 'CONFIRMED' }),
        makeSummary({ id: 10, reference: 'EH-UNPAID0001', status: 'PENDING_PAYMENT' }),
      ]),
    )
    renderAt()

    expect(await screen.findByRole('link', { name: 'View tickets' })).toHaveAttribute('href', '/bookings/9/tickets')
    expect(screen.getByRole('link', { name: 'Complete payment' })).toHaveAttribute('href', '/bookings/10')
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(listMyBookings)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(resultPage([makeSummary()]))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Symphony Night')).toBeInTheDocument()
  })
})