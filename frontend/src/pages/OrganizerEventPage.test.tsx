import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import {
  cancelEvent,
  createTicketType,
  deleteTicketType,
  getOrganizerEvent,
  listSeatSections,
  listTicketTypes,
  publishEvent,
  unpublishEvent,
} from '../api/organizer'
import { getEventStats } from '../api/organizerOperations'
import { makeOrganizerEvent, makeSeatSection, makeTicketType } from '../test/organizerFixtures'
import { makeStats } from '../test/organizerOpsFixtures'
import { OrganizerEventPage } from './OrganizerEventPage'

vi.mock('../api/organizer', () => ({
  listOrganizerEvents: vi.fn(),
  getOrganizerEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  publishEvent: vi.fn(),
  unpublishEvent: vi.fn(),
  cancelEvent: vi.fn(),
  listTicketTypes: vi.fn(),
  createTicketType: vi.fn(),
  deleteTicketType: vi.fn(),
  listVenues: vi.fn(),
  createVenue: vi.fn(),
  listSeatSections: vi.fn(),
}))
vi.mock('../api/organizerOperations', () => ({
  getVenue: vi.fn(),
  createSeatBlock: vi.fn(),
  deleteSeatSection: vi.fn(),
  getEventStats: vi.fn(),
  listEventBookings: vi.fn(),
  checkInTicket: vi.fn(),
  getAttendance: vi.fn(),
}))

function renderAt(path = '/organizer/events/7') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/organizer/events/:id" element={<OrganizerEventPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const badge = (text: string) => screen.findByText(text, { selector: 'span' })

describe('OrganizerEventPage', () => {
  beforeEach(() => {
    for (const fn of [getOrganizerEvent, listTicketTypes, createTicketType, deleteTicketType, publishEvent, unpublishEvent, cancelEvent, listSeatSections, getEventStats]) {
      vi.mocked(fn).mockReset()
    }
    vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent())
    vi.mocked(listTicketTypes).mockResolvedValue([makeTicketType()])
    vi.mocked(getEventStats).mockResolvedValue(makeStats())
  })

  describe('the event', () => {
    it('shows a draft with its schedule at the venue and an edit link', async () => {
      renderAt()

      expect(await screen.findByRole('heading', { name: 'Sitar Evening' })).toBeInTheDocument()
      expect(await badge('Draft')).toBeInTheDocument()
      expect(screen.getByText(/7:00 pm – 10:00 pm/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute('href', '/organizer/events/7/edit')
      expect(screen.queryByRole('link', { name: 'View public page' })).not.toBeInTheDocument()
      expect(getOrganizerEvent).toHaveBeenCalledWith(7, expect.any(AbortSignal))
    })

    it('shows "Event not found" when the server says 404', async () => {
      vi.mocked(getOrganizerEvent).mockRejectedValue(new ApiError({ message: 'Event not found', status: 404 }))
      renderAt('/organizer/events/999')

      expect(await screen.findByRole('heading', { name: 'Event not found' })).toBeInTheDocument()
    })
  })

  describe('links and sales numbers', () => {
    it('offers no bookings, check-in or sales for a draft', async () => {
      renderAt()
      await screen.findByRole('heading', { name: 'Sitar Evening' })

      expect(screen.queryByRole('link', { name: 'Bookings' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Check-in' })).not.toBeInTheDocument()
      expect(getEventStats).not.toHaveBeenCalled()
    })

    it('links a published event to its bookings and check-in, and shows its sales numbers', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
      renderAt()

      expect(await screen.findByRole('link', { name: 'Bookings' })).toHaveAttribute('href', '/organizer/events/7/bookings')
      expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute('href', '/organizer/events/7/check-in')
      expect(await screen.findByText(/1,998/)).toBeInTheDocument()
      expect(getEventStats).toHaveBeenCalledWith(7, expect.any(AbortSignal))
    })

    it('offers venue seat management for reserved-seating events', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ seatingMode: 'RESERVED_SEATING' }))
      renderAt()

      expect(await screen.findByRole('link', { name: 'Manage venue seats' })).toHaveAttribute('href', '/organizer/venues/1/seats')
    })
  })

  describe('ticket types', () => {
    it('lists each ticket type with sold, remaining, limit and sales window', async () => {
      vi.mocked(listTicketTypes).mockResolvedValue([
        makeTicketType(),
        makeTicketType({ id: 2, name: 'Early bird', salesStart: '2027-01-01T04:30:00Z', salesEnd: '2027-01-08T12:30:00Z' }),
      ])
      renderAt()

      expect(await screen.findByText('Standing')).toBeInTheDocument()
      expect(screen.getAllByText(/12 sold · 38 remaining of 50/)).toHaveLength(2)
      expect(screen.getByText('No sales window: on sale while the event is published.')).toBeInTheDocument()
      expect(screen.getByText(/Sales open 1 Jan 2027, 10:00 am · Sales close 8 Jan 2027, 6:00 pm/)).toBeInTheDocument()
    })

    it('tells the organizer to add a ticket type first when there are none', async () => {
      vi.mocked(listTicketTypes).mockResolvedValue([])
      renderAt()

      expect(await screen.findByText('Add at least one ticket type before publishing.')).toBeInTheDocument()
      expect(screen.getByText(/No ticket types yet/)).toBeInTheDocument()
    })

    it('adds a general-admission ticket type and refreshes the list', async () => {
      vi.mocked(createTicketType).mockResolvedValue(makeTicketType({ id: 2, name: 'Balcony' }))
      renderAt()
      const user = userEvent.setup()
      await screen.findByText('Standing')

      await user.click(screen.getByRole('button', { name: 'Add ticket type' }))
      await user.type(screen.getByLabelText('Name'), 'Balcony')
      await user.type(screen.getByLabelText('Price (INR)'), '300')
      await user.type(screen.getByLabelText('Quantity'), '40')
      await user.click(screen.getByRole('button', { name: 'Save ticket type' }))

      expect(await screen.findByText(/Ticket type “Balcony” was added/)).toBeInTheDocument()
      expect(createTicketType).toHaveBeenCalledWith(7, { name: 'Balcony', price: 300, quantityTotal: 40 })
      expect(listTicketTypes).toHaveBeenCalledTimes(2)
    })

    it('adds a reserved-seating ticket type by choosing one of the venue seat sections', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ seatingMode: 'RESERVED_SEATING' }))
      vi.mocked(listSeatSections).mockResolvedValue([makeSeatSection()])
      vi.mocked(createTicketType).mockResolvedValue(makeTicketType({ id: 3, name: 'VIP', seatSection: 'VIP' }))
      renderAt()
      const user = userEvent.setup()
      await screen.findByText('Standing')

      await user.click(screen.getByRole('button', { name: 'Add ticket type' }))
      await user.type(screen.getByLabelText('Name'), 'VIP')
      await user.type(screen.getByLabelText('Price (INR)'), '2500')
      await user.selectOptions(await screen.findByLabelText('Seat section'), 'VIP')
      await user.click(screen.getByRole('button', { name: 'Save ticket type' }))

      expect(await screen.findByText(/Ticket type “VIP” was added/)).toBeInTheDocument()
      expect(createTicketType).toHaveBeenCalledWith(7, { name: 'VIP', price: 2500, seatSection: 'VIP' })
      expect(listSeatSections).toHaveBeenCalledWith(1, expect.any(AbortSignal))
      expect(screen.queryByLabelText('Quantity')).not.toBeInTheDocument()
    })

    it('checks the form without calling the server', async () => {
      renderAt()
      const user = userEvent.setup()
      await screen.findByText('Standing')

      await user.click(screen.getByRole('button', { name: 'Add ticket type' }))
      await user.click(screen.getByRole('button', { name: 'Save ticket type' }))

      expect(screen.getByText('Enter a name.')).toBeInTheDocument()
      expect(screen.getByText('Enter a whole number of 1 or more.')).toBeInTheDocument()
      expect(createTicketType).not.toHaveBeenCalled()
    })

    it('deletes a ticket type only after a second, explicit confirmation', async () => {
      vi.mocked(deleteTicketType).mockResolvedValue(undefined)
      renderAt()
      const user = userEvent.setup()
      await screen.findByText('Standing')

      await user.click(screen.getByRole('button', { name: 'Delete Standing' }))
      expect(deleteTicketType).not.toHaveBeenCalled() // the first click only asks "are you sure?"
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(await screen.findByText(/Ticket type “Standing” was deleted/)).toBeInTheDocument()
      expect(deleteTicketType).toHaveBeenCalledWith(7, 1)
      expect(listTicketTypes).toHaveBeenCalledTimes(2)
    })

    it('shows the server\'s reason when a ticket type cannot be deleted', async () => {
      vi.mocked(deleteTicketType).mockRejectedValue(
        new ApiError({ message: 'This ticket type is referenced by bookings and cannot be deleted', status: 409 }),
      )
      renderAt()
      const user = userEvent.setup()
      await screen.findByText('Standing')

      await user.click(screen.getByRole('button', { name: 'Delete Standing' }))
      await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('referenced by bookings')
      expect(screen.getByText('Standing')).toBeInTheDocument()
    })
  })

  describe('publishing and cancelling', () => {
    it('publishes a draft and shows the new status and the public page link at once', async () => {
      vi.mocked(publishEvent).mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
      renderAt()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Publish' }))

      expect(await badge('Published')).toBeInTheDocument()
      expect(publishEvent).toHaveBeenCalledWith(7)
      expect(screen.getByRole('link', { name: 'View public page' })).toHaveAttribute('href', '/events/7')
      expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
    })

    it('shows the server\'s reason when publishing is refused and the event stays a draft', async () => {
      vi.mocked(publishEvent).mockRejectedValue(
        new ApiError({ message: 'An event needs at least one ticket type before it can be published', status: 409 }),
      )
      renderAt()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Publish' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('needs at least one ticket type')
      expect(await badge('Draft')).toBeInTheDocument()
    })

    it('unpublishes a published event', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
      vi.mocked(unpublishEvent).mockResolvedValue(makeOrganizerEvent({ status: 'DRAFT' }))
      renderAt()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Unpublish' }))

      expect(await badge('Draft')).toBeInTheDocument()
      expect(unpublishEvent).toHaveBeenCalledWith(7)
      expect(screen.queryByRole('link', { name: 'View public page' })).not.toBeInTheDocument()
    })

    it('cancels only after a second confirmation that explains the consequences, then becomes read-only', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'PUBLISHED' }))
      vi.mocked(cancelEvent).mockResolvedValue(makeOrganizerEvent({ status: 'CANCELLED' }))
      renderAt()
      const user = userEvent.setup()

      await user.click(await screen.findByRole('button', { name: 'Cancel event' }))
      expect(screen.getByText(/This is permanent/)).toBeInTheDocument()
      expect(screen.getByText(/demo payments are refunded/)).toBeInTheDocument()
      expect(cancelEvent).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Yes, cancel event' }))

      expect(await badge('Cancelled')).toBeInTheDocument()
      expect(cancelEvent).toHaveBeenCalledWith(7)
      expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add ticket type' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete Standing' })).not.toBeInTheDocument()
    })

    it('shows an event that is already cancelled as read-only', async () => {
      vi.mocked(getOrganizerEvent).mockResolvedValue(makeOrganizerEvent({ status: 'CANCELLED' }))
      renderAt()

      expect(await screen.findByText(/This event was cancelled/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add ticket type' })).not.toBeInTheDocument()
    })
  })
})