import { describe, expect, it } from 'vitest'
import {
  EMPTY_EVENT_FORM,
  EMPTY_VENUE_FORM,
  eventToFormValues,
  toCreateEventInput,
  toUpdateEventInput,
  toVenueInput,
  validateEvent,
  validateVenue,
} from './organizerValidation'
import { makeOrganizerEvent } from '../test/organizerFixtures'

const validVenue = { ...EMPTY_VENUE_FORM, name: 'City Hall', addressLine: '1 Main Road', city: 'Agra', country: 'India', timeZone: 'Asia/Kolkata', capacity: '500' }
const validEvent = { ...EMPTY_EVENT_FORM, venueId: '1', title: 'Sitar Evening', category: 'Music', startsLocal: '2027-01-10T19:00', endsLocal: '2027-01-10T22:00' }

describe('venue validation', () => {
  it('asks for every required field and a real time zone and capacity', () => {
    const errors = validateVenue({ ...EMPTY_VENUE_FORM, timeZone: 'Asia/Kolkatta', capacity: '0' })

    expect(Object.keys(errors).sort()).toEqual(['addressLine', 'capacity', 'city', 'country', 'name', 'timeZone'])
  })

  it('accepts a complete venue and leaves the empty region out of the request', () => {
    expect(validateVenue(validVenue)).toEqual({})
    expect(toVenueInput(validVenue)).toEqual({
      name: 'City Hall',
      addressLine: '1 Main Road',
      city: 'Agra',
      country: 'India',
      timeZone: 'Asia/Kolkata',
      capacity: 500,
    })
    expect(toVenueInput({ ...validVenue, region: ' Uttar Pradesh ' }).region).toBe('Uttar Pradesh')
  })
})

describe('event validation', () => {
  it('accepts a complete event', () => {
    expect(validateEvent(validEvent, 'create', 'Asia/Kolkata')).toEqual({})
  })

  it('requires a venue only when creating, and the basic fields always', () => {
    expect(validateEvent({ ...validEvent, venueId: '' }, 'create', null).venueId).toBeDefined()
    expect(validateEvent({ ...validEvent, venueId: '' }, 'edit', 'Asia/Kolkata').venueId).toBeUndefined()
    const errors = validateEvent({ ...EMPTY_EVENT_FORM, venueId: '1' }, 'create', 'Asia/Kolkata')
    expect(Object.keys(errors).sort()).toEqual(['category', 'endsLocal', 'startsLocal', 'title'])
  })

  it('rejects an end that is not after the start, a bad image link, currency and cutoff', () => {
    expect(validateEvent({ ...validEvent, endsLocal: '2027-01-10T19:00' }, 'create', 'Asia/Kolkata').endsLocal).toBe('The end must be after the start.')
    expect(validateEvent({ ...validEvent, imageUrl: 'ftp://x' }, 'create', 'Asia/Kolkata').imageUrl).toBeDefined()
    expect(validateEvent({ ...validEvent, currency: 'RUPEES' }, 'create', 'Asia/Kolkata').currency).toBeDefined()
    expect(validateEvent({ ...validEvent, cancellationCutoffHours: '-1' }, 'create', 'Asia/Kolkata').cancellationCutoffHours).toBeDefined()
  })

  it('builds requests in UTC from venue-local times and omits empty optional fields', () => {
    expect(toCreateEventInput(validEvent, 'Asia/Kolkata')).toEqual({
      venueId: 1,
      title: 'Sitar Evening',
      category: 'Music',
      startsAt: '2027-01-10T13:30:00.000Z',
      endsAt: '2027-01-10T16:30:00.000Z',
      seatingMode: 'GENERAL_ADMISSION',
      currency: 'INR',
      cancellationCutoffHours: 24,
    })
    expect(toUpdateEventInput({ ...validEvent, description: ' Hello ', imageUrl: 'https://x.test/a.png' }, 'Asia/Kolkata')).toEqual({
      title: 'Sitar Evening',
      description: 'Hello',
      category: 'Music',
      imageUrl: 'https://x.test/a.png',
      startsAt: '2027-01-10T13:30:00.000Z',
      endsAt: '2027-01-10T16:30:00.000Z',
      cancellationCutoffHours: 24,
    })
  })

  it('fills the edit form with the times as they read at the venue', () => {
    const values = eventToFormValues(makeOrganizerEvent())

    expect(values.startsLocal).toBe('2027-01-10T19:00')
    expect(values.endsLocal).toBe('2027-01-10T22:00')
    expect(values.venueId).toBe('1')
  })
})