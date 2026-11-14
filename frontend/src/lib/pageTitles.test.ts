import { describe, expect, it } from 'vitest'
import { BRAND } from './brand'
import { pageTitle } from './pageTitles'

const withBrand = (title: string) => `${title} | ${BRAND.name}`

describe('pageTitle', () => {
  it('gives the home page the full site title and other pages a "Page | name" title', () => {
    expect(pageTitle('/')).toBe(BRAND.homeTitle)
    expect(pageTitle('/events')).toBe(withBrand('Events'))
    expect(pageTitle('/my-bookings')).toBe(withBrand('My bookings'))
  })

  it('tells similar paths apart', () => {
    expect(pageTitle('/events/7')).toBe(withBrand('Event details'))
    expect(pageTitle('/events/7/seats')).toBe(withBrand('Choose your seats'))
    expect(pageTitle('/bookings/5')).toBe(withBrand('Booking'))
    expect(pageTitle('/bookings/5/tickets')).toBe(withBrand('Your tickets'))
    expect(pageTitle('/organizer/events/new')).toBe(withBrand('New event'))
    expect(pageTitle('/organizer/events/9/check-in')).toBe(withBrand('Check-in'))
    expect(pageTitle('/admin/bookings/3')).toBe(withBrand('Booking details'))
  })

  it('treats anything unknown as the not-found page', () => {
    expect(pageTitle('/nope')).toBe(withBrand('Page not found'))
    expect(pageTitle('/events/abc')).toBe(withBrand('Page not found'))
  })
})