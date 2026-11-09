import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { getBookingTickets, getTicketQr } from '../api/tickets'
import { makeTicket } from '../test/ticketFixtures'
import { BookingTicketsPage } from './BookingTicketsPage'

vi.mock('../api/tickets', () => ({ getBookingTickets: vi.fn(), getTicket: vi.fn(), getTicketQr: vi.fn() }))

function renderPage(path = '/bookings/55/tickets') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/bookings/:id/tickets" element={<BookingTicketsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BookingTicketsPage', () => {
  beforeEach(() => {
    vi.mocked(getBookingTickets).mockReset()
    vi.mocked(getTicketQr).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a valid ticket with its details, seat, code and QR image', async () => {
    vi.mocked(getBookingTickets).mockResolvedValue([makeTicket()])
    renderPage()

    expect(await screen.findByRole('heading', { name: /Symphony Night/ })).toBeInTheDocument()
    expect(screen.getByText(/City Hall/)).toBeInTheDocument()
    expect(screen.getByText('VIP · Row A · Seat 3')).toBeInTheDocument()
    expect(screen.getByText('Valid')).toBeInTheDocument()
    expect(screen.getByText('TK-4M7Q0XB92HZ5N3C8DKWA')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /Entry QR code/ })).toBeInTheDocument()
    expect(getBookingTickets).toHaveBeenCalledWith(55, expect.any(AbortSignal))
    expect(getTicketQr).toHaveBeenCalledWith(301, expect.any(AbortSignal))
  })

  it('shows a used ticket as used and never asks for its QR code', async () => {
    vi.mocked(getBookingTickets).mockResolvedValue([
      makeTicket({ status: 'CHECKED_IN', qrAvailable: false, checkedInAt: '2027-01-10T13:40:00Z' }),
    ])
    renderPage()

    expect(await screen.findByText('Already used')).toBeInTheDocument()
    expect(screen.getByText(/Checked in/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Entry QR code/ })).not.toBeInTheDocument()
    expect(getTicketQr).not.toHaveBeenCalled()
  })

  it('shows a cancelled ticket as cancelled, without a QR code', async () => {
    vi.mocked(getBookingTickets).mockResolvedValue([makeTicket({ status: 'VOID', qrAvailable: false })])
    renderPage()

    expect(await screen.findByText('Ticket cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Entry QR code/ })).not.toBeInTheDocument()
    expect(getTicketQr).not.toHaveBeenCalled()
  })

  it('shows a general-admission ticket without a seat', async () => {
    vi.mocked(getBookingTickets).mockResolvedValue([makeTicket({ seat: null, ticketTypeName: 'Standing' })])
    renderPage()

    expect(await screen.findByText('General admission (no assigned seat)')).toBeInTheDocument()
  })

  it('explains that tickets appear after payment', async () => {
    vi.mocked(getBookingTickets).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/No tickets yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the booking' })).toHaveAttribute('href', '/bookings/55')
  })

  it('shows "Tickets not found" when the server says 404', async () => {
    vi.mocked(getBookingTickets).mockRejectedValue(new ApiError({ message: 'Booking not found', status: 404 }))
    renderPage('/bookings/999/tickets')

    expect(await screen.findByRole('heading', { name: 'Tickets not found' })).toBeInTheDocument()
  })

  it('prints the tickets and explains a QR code that cannot be loaded', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    vi.mocked(getBookingTickets).mockResolvedValue([makeTicket()])
    vi.mocked(getTicketQr).mockRejectedValue(new ApiError({ message: 'Conflict', status: 409 }))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('can no longer be used')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Print tickets' }))

    expect(print).toHaveBeenCalledTimes(1)
  })
})