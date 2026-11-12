import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminLayout } from './AdminLayout'
import { OrganizerLayout } from './OrganizerLayout'

describe('workspace layouts', () => {
  it('frames organizer pages with the Organizer workspace bar', () => {
    render(
      <MemoryRouter initialEntries={['/organizer']}>
        <Routes>
          <Route path="/organizer" element={<OrganizerLayout />}>
            <Route index element={<p>organizer page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Organizer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'New event' })).toHaveAttribute('href', '/organizer/events/new')
    expect(screen.getByText('organizer page')).toBeInTheDocument()
  })

  it('frames admin pages with the Admin workspace bar and a hidden page title', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="users" element={<p>users page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Admin' })
    expect(nav.querySelectorAll('a')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'Administration' })).toBeInTheDocument()
    expect(screen.getByText('users page')).toBeInTheDocument()
  })

  it('only highlights the admin Dashboard on its own page', () => {
    render(
      <MemoryRouter initialEntries={['/admin/events']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="events" element={<p>events page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('aria-current', 'page')
  })
})