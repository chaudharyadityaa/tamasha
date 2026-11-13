import { describe, expect, it } from 'vitest'
import { pageTitle } from './pageTitles'

describe('pageTitle', () => {
  it('gives the home page the full site title and other pages a "Page | EventHub" title', () => {
    expect(pageTitle('/')).toBe('EventHub: find your next night out')
    expect(pageTitle('/events')).toBe('Events | EventHub')
    expect(pageTitle('/my-bookings')).toBe('My bookings | EventHub')
  })

  it('tells similar paths apart', () => {
    expect(pageTitle('/events/7')).toBe('Event details | EventHub')
    expect(pageTitle('/events/7/seats')).toBe('Choose your seats | EventHub')
    expect(pageTitle('/bookings/5')).toBe('Booking | EventHub')
    expect(pageTitle('/bookings/5/tickets')).toBe('Your tickets | EventHub')
    expect(pageTitle('/organizer/events/new')).toBe('New event | EventHub')
    expect(pageTitle('/organizer/events/9/check-in')).toBe('Check-in | EventHub')
    expect(pageTitle('/admin/bookings/3')).toBe('Booking details | EventHub')
  })

  it('treats anything unknown as the not-found page', () => {
    expect(pageTitle('/nope')).toBe('Page not found | EventHub')
    expect(pageTitle('/events/abc')).toBe('Page not found | EventHub')
  })
})