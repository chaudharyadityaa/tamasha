import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminDashboard } from '../api/admin'
import { ApiError } from '../api/errors'
import { makeDashboard } from '../test/adminFixtures'
import { AdminDashboardPage } from './AdminDashboardPage'

vi.mock('../api/admin', () => ({
  getAdminDashboard: vi.fn(),
  listUsers: vi.fn(),
  setUserEnabled: vi.fn(),
  setUserRole: vi.fn(),
}))

const card = (name: string) => within(screen.getByRole('region', { name }))

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminDashboard).mockReset().mockResolvedValue(makeDashboard())
  })

  it('shows the platform numbers with readable labels', async () => {
    render(<AdminDashboardPage />)

    await screen.findByRole('region', { name: 'Users' })
    expect(card('Users').getByText('12')).toBeInTheDocument()
    expect(card('Users').getByText('2 disabled')).toBeInTheDocument()
    expect(card('Users').getByText('Customer')).toBeInTheDocument()
    expect(card('Users').getByText('Administrator')).toBeInTheDocument()
    expect(card('Events').getByText('5 upcoming and published')).toBeInTheDocument()
    expect(card('Events').getByText('Published')).toBeInTheDocument()
    expect(card('Bookings').getByText('20')).toBeInTheDocument()
    expect(card('Bookings').getByText('Awaiting payment')).toBeInTheDocument()
    expect(card('Tickets').getByText('Checked in')).toBeInTheDocument()
    expect(getAdminDashboard).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('shows revenue per currency, never added together', async () => {
    vi.mocked(getAdminDashboard).mockResolvedValue(
      makeDashboard({ confirmedRevenue: [{ currency: 'INR', amount: 15998.5 }, { currency: 'USD', amount: 40 }] }),
    )
    render(<AdminDashboardPage />)

    await screen.findByRole('region', { name: 'Revenue (confirmed bookings)' })
    expect(card('Revenue (confirmed bookings)').getByText(/15,998\.50/)).toBeInTheDocument()
    expect(card('Revenue (confirmed bookings)').getByText(/40\.00/)).toBeInTheDocument()
  })

  it('says whether demo payments are on or off, and that nothing is confirmed yet', async () => {
    vi.mocked(getAdminDashboard).mockResolvedValue(makeDashboard({ demoPaymentsEnabled: false, confirmedRevenue: [] }))
    render(<AdminDashboardPage />)

    expect(await screen.findByText(/Demo payments are OFF/)).toBeInTheDocument()
    expect(screen.getByText('No confirmed bookings yet.')).toBeInTheDocument()
  })

  it('shows a friendly error and lets the person try again', async () => {
    vi.mocked(getAdminDashboard)
      .mockRejectedValueOnce(new ApiError({ message: 'Network error', isNetworkError: true }))
      .mockResolvedValue(makeDashboard())
    render(<AdminDashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText(/Demo payments are ON/)).toBeInTheDocument()
  })
})