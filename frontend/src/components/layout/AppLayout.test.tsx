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
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return screen.getByRole('main')
}

describe('AppLayout', () => {
  it('lets the home page and the events list use the full width', () => {
    expect(renderAt('/').className).not.toContain('max-w-6xl')
  })

  it('lets an event page use the full width for its header', () => {
    expect(renderAt('/events/7').className).not.toContain('max-w-6xl')
  })

  it('keeps every other page, and an event page with an invalid id, in the centered column', () => {
    expect(renderAt('/my-bookings').className).toContain('max-w-6xl')
  })

  it('keeps an event page with an invalid id in the centered column', () => {
    expect(renderAt('/events/abc').className).toContain('max-w-6xl')
  })
})