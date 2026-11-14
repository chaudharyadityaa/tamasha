import { BRAND } from './brand'

// First match wins, so more specific paths come before general ones. The home page has its own full title.
const TITLES: [RegExp, string][] = [
  [/^\/events$/, 'Events'],
  [/^\/events\/\d+\/seats$/, 'Choose your seats'],
  [/^\/events\/\d+$/, 'Event details'],
  [/^\/login$/, 'Log in'],
  [/^\/register$/, 'Create your account'],
  [/^\/my-bookings$/, 'My bookings'],
  [/^\/bookings\/\d+\/tickets$/, 'Your tickets'],
  [/^\/bookings\/\d+$/, 'Booking'],
  [/^\/organizer$/, 'Organizer dashboard'],
  [/^\/organizer\/venues$/, 'Venues'],
  [/^\/organizer\/venues\/\d+\/seats$/, 'Venue seats'],
  [/^\/organizer\/events\/new$/, 'New event'],
  [/^\/organizer\/events\/\d+$/, 'Manage event'],
  [/^\/organizer\/events\/\d+\/edit$/, 'Edit event'],
  [/^\/organizer\/events\/\d+\/bookings$/, 'Event bookings'],
  [/^\/organizer\/events\/\d+\/check-in$/, 'Check-in'],
  [/^\/admin$/, 'Admin dashboard'],
  [/^\/admin\/users$/, 'Users'],
  [/^\/admin\/events$/, 'Events (admin)'],
  [/^\/admin\/bookings$/, 'Bookings (admin)'],
  [/^\/admin\/bookings\/\d+$/, 'Booking details'],
  [/^\/access-denied$/, 'Access denied'],
]

/** The browser tab title for a path. Unknown paths are the "not found" page. */
export function pageTitle(pathname: string): string {
  if (pathname === '/') {
    return BRAND.homeTitle
  }
  const match = TITLES.find(([pattern]) => pattern.test(pathname))
  if (!match) {
    return `Page not found | ${BRAND.name}`
  }
  return `${match[1]} | ${BRAND.name}`
}