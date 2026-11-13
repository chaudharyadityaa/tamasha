import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RouteAnnouncer } from './RouteAnnouncer'

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/events']}>
      <RouteAnnouncer />
      <nav>
        <Link to="/events?q=jazz">Filter</Link>
        <Link to="/login">Log in</Link>
      </nav>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/events" element={<p>events</p>} />
          <Route path="/login" element={<p>login</p>} />
        </Routes>
      </main>
    </MemoryRouter>,
  )
}

describe('RouteAnnouncer', () => {
  it('sets the tab title, and leaves focus alone on the first load', () => {
    renderApp()

    expect(document.title).toBe('Events | EventHub')
    expect(screen.getByRole('main')).not.toHaveFocus()
  })

  it('updates the title, scrolls to the top and moves focus to the content when the page changes', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    renderApp()

    await userEvent.setup().click(screen.getByRole('link', { name: 'Log in' }))

    expect(document.title).toBe('Log in | EventHub')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(screen.getByRole('main')).toHaveFocus()
    scrollTo.mockRestore()
  })

  it('does nothing when only the query string changes, such as filtering or paging', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    renderApp()

    await userEvent.setup().click(screen.getByRole('link', { name: 'Filter' }))

    expect(scrollTo).not.toHaveBeenCalled()
    expect(screen.getByRole('main')).not.toHaveFocus()
    scrollTo.mockRestore()
  })
})