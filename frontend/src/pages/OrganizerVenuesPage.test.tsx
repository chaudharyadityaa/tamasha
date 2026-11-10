import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { createVenue, listVenues } from '../api/organizer'
import { makeVenue, pageOf } from '../test/organizerFixtures'
import { OrganizerVenuesPage } from './OrganizerVenuesPage'

vi.mock('../api/organizer', () => ({
  listOrganizerEvents: vi.fn(),
  getOrganizerEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  listVenues: vi.fn(),
  createVenue: vi.fn(),
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/organizer/venues']}>
      <OrganizerVenuesPage />
    </MemoryRouter>,
  )
}

async function fillVenueForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Venue name'), 'Town Arena')
  await user.type(screen.getByLabelText('Address'), '9 Lake Road')
  await user.type(screen.getByLabelText('City'), 'Jaipur')
  await user.type(screen.getByLabelText('Country'), 'India')
  await user.type(screen.getByLabelText('Time zone'), 'Asia/Kolkata')
  await user.type(screen.getByLabelText('Capacity'), '800')
}

describe('OrganizerVenuesPage', () => {
  beforeEach(() => {
    vi.mocked(listVenues).mockReset().mockResolvedValue(pageOf([makeVenue()]))
    vi.mocked(createVenue).mockReset()
  })

  it('lists my venues', async () => {
    renderPage()

    expect(await screen.findByText('City Hall')).toBeInTheDocument()
    expect(screen.getByText(/1 Main Road, Agra, Uttar Pradesh, India/)).toBeInTheDocument()
    expect(screen.getByText(/Capacity 500 · Time zone Asia\/Kolkata/)).toBeInTheDocument()
  })

  it('creates a venue, leaves the empty region out, then shows it in the refreshed list', async () => {
    vi.mocked(createVenue).mockResolvedValue(makeVenue({ id: 2, name: 'Town Arena' }))
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('City Hall')

    await user.click(screen.getByRole('button', { name: 'Add venue' }))
    await fillVenueForm(user)
    await user.click(screen.getByRole('button', { name: 'Create venue' }))

    expect(await screen.findByText(/Venue “Town Arena” was created/)).toBeInTheDocument()
    expect(createVenue).toHaveBeenCalledWith({
      name: 'Town Arena',
      addressLine: '9 Lake Road',
      city: 'Jaipur',
      country: 'India',
      timeZone: 'Asia/Kolkata',
      capacity: 800,
    })
    expect(listVenues).toHaveBeenCalledTimes(2) // the list was loaded again
  })

  it('shows what is missing without calling the server', async () => {
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('City Hall')

    await user.click(screen.getByRole('button', { name: 'Add venue' }))
    await user.click(screen.getByRole('button', { name: 'Create venue' }))

    expect(screen.getByText('Enter the venue name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid time zone such as Asia/Kolkata.')).toBeInTheDocument()
    expect(createVenue).not.toHaveBeenCalled()
  })

  it('puts the server\'s field messages next to the fields', async () => {
    vi.mocked(createVenue).mockRejectedValue(
      new ApiError({ message: 'Validation failed', status: 400, fieldErrors: { name: 'You already have a venue with this name' } }),
    )
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('City Hall')

    await user.click(screen.getByRole('button', { name: 'Add venue' }))
    await fillVenueForm(user)
    await user.click(screen.getByRole('button', { name: 'Create venue' }))

    expect(await screen.findByText('You already have a venue with this name')).toBeInTheDocument()
  })
})