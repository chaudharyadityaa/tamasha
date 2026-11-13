import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listMyBookings } from '../api/bookings'
import { getEvent, searchEvents } from '../api/events'
import { getSeatMap } from '../api/seats'
import { getBookingTickets, getTicketQr } from '../api/tickets'
import type { EventSummary, PageResponse } from '../api/types'
import { AuthContext } from '../auth/authContext'
import type { AuthContextValue } from '../auth/authContext'
import { AppLayout } from '../components/layout/AppLayout'
import { BookingTicketsPage } from '../pages/BookingTicketsPage'
import { EventDetailPage } from '../pages/EventDetailPage'
import { EventsPage } from '../pages/EventsPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { MyBookingsPage } from '../pages/MyBookingsPage'
import { RegisterPage } from '../pages/RegisterPage'
import { SeatSelectionPage } from '../pages/SeatSelectionPage'
import { accessibilityProblems } from './a11y'
import { authContext, loggedIn, makeEvent, makeReservedEvent, makeSeatMap } from './fixtures'
import { makeSummary, makeTicket } from './ticketFixtures'

vi.mock('../api/events', () => ({ searchEvents: vi.fn(), getEvent: vi.fn() }))
vi.mock('../api/seats', () => ({ getSeatMap: vi.fn() }))
vi.mock('../api/tickets', () => ({ getBookingTickets: vi.fn(), getTicket: vi.fn(), getTicketQr: vi.fn() }))
vi.mock('../api/bookings', () => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  payWithDemo: vi.fn(),
  listMyBookings: vi.fn(),
}))

const jazz: EventSummary = {
  id: 1,
  title: 'Jazz Night',
  category: 'Music',
  imageUrl: null,
  startsAt: '2027-01-10T13:30:00Z',
  endsAt: '2027-01-10T16:30:00Z',
  venueName: 'City Hall',
  city: 'Agra',
  timeZone: 'Asia/Kolkata',
  startingPrice: 500,
  currency: 'INR',
}

const events: PageResponse<EventSummary> = { content: [jazz], page: 0, size: 12, totalElements: 1, totalPages: 1 }

function renderAt(path: string, route: string, element: ReactElement, auth: AuthContextValue = authContext()) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('accessibility (automated audit of the main pages)', () => {
  beforeEach(() => {
    vi.mocked(searchEvents).mockReset().mockResolvedValue(events)
    vi.mocked(getEvent).mockReset().mockResolvedValue(makeEvent())
    vi.mocked(getSeatMap).mockReset().mockResolvedValue(makeSeatMap())
    vi.mocked(getBookingTickets).mockReset().mockResolvedValue([makeTicket()])
    vi.mocked(getTicketQr).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    vi.mocked(listMyBookings)
      .mockReset()
      .mockResolvedValue({ content: [makeSummary()], page: 0, size: 10, totalElements: 1, totalPages: 1 })
  })

  it('home page, inside the full layout with navigation and footer', async () => {
    const { container } = render(
      <AuthContext.Provider value={authContext()}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    await screen.findByRole('region', { name: 'Upcoming events' })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('events page with results', async () => {
    const { container } = renderAt('/events', '/events', <EventsPage />)
    await screen.findByText('Jazz Night')

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('login page', async () => {
    const { container } = renderAt('/login', '/login', <LoginPage />)
    await screen.findByRole('heading', { name: 'Log in' })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('register page', async () => {
    const { container } = renderAt('/register', '/register', <RegisterPage />)
    await screen.findByRole('heading', { name: 'Create your account' })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('event page with its ticket panel', async () => {
    const { container } = renderAt('/events/7', '/events/:id', <EventDetailPage />)
    await screen.findByRole('heading', { level: 1, name: 'Sitar Evening' })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('seat map', async () => {
    vi.mocked(getEvent).mockResolvedValue(makeReservedEvent())
    const { container } = renderAt('/events/7/seats', '/events/:id/seats', <SeatSelectionPage />, loggedIn())
    await screen.findByRole('button', { name: /VIP, row A, seat 1,/ })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('ticket stubs', async () => {
    const { container } = renderAt('/bookings/55/tickets', '/bookings/:id/tickets', <BookingTicketsPage />, loggedIn())
    await screen.findByRole('img', { name: /Entry QR code/ })

    expect(await accessibilityProblems(container)).toEqual([])
  })

  it('my bookings', async () => {
    const { container } = renderAt('/my-bookings', '/my-bookings', <MyBookingsPage />, loggedIn())
    await screen.findByText('Symphony Night')

    expect(await accessibilityProblems(container)).toEqual([])
  })
})