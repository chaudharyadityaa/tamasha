import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTicketQr } from '../../api/tickets'
import { makeTicket } from '../../test/ticketFixtures'
import { TicketCard } from './TicketCard'

vi.mock('../../api/tickets', () => ({ getBookingTickets: vi.fn(), getTicket: vi.fn(), getTicketQr: vi.fn() }))

describe('TicketCard', () => {
  beforeEach(() => {
    vi.mocked(getTicketQr).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  })

  it('shows a valid ticket with its details, seat, code and QR image', async () => {
    render(<ul><TicketCard ticket={makeTicket()} /></ul>)

    expect(screen.getByRole('heading', { name: 'Symphony Night' })).toBeInTheDocument()
    expect(screen.getByText('Valid')).toBeInTheDocument()
    expect(screen.getByText('VIP · Row A · Seat 3')).toBeInTheDocument()
    expect(screen.getByText('TK-4M7Q0XB92HZ5N3C8DKWA')).toBeInTheDocument()
    expect(screen.getByText(/Keep this code private/)).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /Entry QR code/ })).toBeInTheDocument()
  })

  it('shows a general-admission ticket without a seat', () => {
    render(<ul><TicketCard ticket={makeTicket({ seat: null, ticketTypeName: 'Standing' })} /></ul>)

    expect(screen.getByText('General admission (no assigned seat)')).toBeInTheDocument()
  })

  it('shows a used ticket as used, with when it was checked in, and no QR code', () => {
    render(
      <ul>
        <TicketCard ticket={makeTicket({ status: 'CHECKED_IN', qrAvailable: false, checkedInAt: '2027-01-10T13:40:00Z' })} />
      </ul>,
    )

    expect(screen.getByText('Already used')).toBeInTheDocument()
    expect(screen.getByText(/Checked in/)).toBeInTheDocument()
    expect(getTicketQr).not.toHaveBeenCalled()
  })

  it('shows a cancelled ticket as cancelled, with no QR code', () => {
    render(<ul><TicketCard ticket={makeTicket({ status: 'VOID', qrAvailable: false })} /></ul>)

    expect(screen.getByText('Ticket cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Entry QR code/ })).not.toBeInTheDocument()
    expect(getTicketQr).not.toHaveBeenCalled()
  })
})