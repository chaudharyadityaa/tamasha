import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../../auth/authContext'
import { authContext } from '../../test/fixtures'
import { AppLayout } from './AppLayout'

function renderAt(path: string) {
  render(
    <AuthContext.Provider value={authContext()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>home</p>} />
            <Route path="/events" element={<p>events</p>} />
            <Route path="/events/:id" element={<p>event</p>} />
            <Route path="/my-bookings" element={<p>bookings</p>} />
            <Route path="/organizer/venues" element={<p>venues</p>} />
            <Route path="/bookings/:id" element={<p>booking</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return screen.getByRole('main')
}

const isFullWidth = (main: HTMLElement) => !main.className.includes('max-w-6xl')

describe('AppLayout', () => {
  it('lets the home page and the events list use the full width', () => {
    expect(isFullWidth(renderAt('/'))).toBe(true)
  })

  it('lets an event page use the full width for its header', () => {
    expect(isFullWidth(renderAt('/events/7'))).toBe(true)
  })

  it('lets My bookings draw its own header band', () => {
    expect(isFullWidth(renderAt('/my-bookings'))).toBe(true)
  })

  it('lets the organizer and admin areas draw their own workspace bar', () => {
    expect(isFullWidth(renderAt('/organizer/venues'))).toBe(true)
  })

  it('keeps the booking page in the centered column', () => {
    expect(isFullWidth(renderAt('/bookings/5'))).toBe(false)
  })

  it('keeps an event page with an invalid id in the centered column', () => {
    expect(isFullWidth(renderAt('/events/abc'))).toBe(false)
  })
})