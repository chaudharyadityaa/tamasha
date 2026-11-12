import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WorkspaceNav } from './WorkspaceNav'

const items = [
  { to: '/organizer', label: 'Dashboard', end: true },
  { to: '/organizer/venues', label: 'Venues', end: false },
]

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceNav label="Organizer" items={items} />
    </MemoryRouter>,
  )
}

describe('WorkspaceNav', () => {
  it('is a labelled navigation with one link per item', () => {
    renderAt('/organizer')

    const nav = screen.getByRole('navigation', { name: 'Organizer' })
    expect(nav.querySelectorAll('a')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute('href', '/organizer/venues')
  })

  it('marks the current section, and only the Dashboard link is exact', () => {
    renderAt('/organizer/venues')

    expect(screen.getByRole('link', { name: 'Venues' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })
})