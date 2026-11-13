import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Broken(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('shows a friendly message and a way out when a page crashes', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined) // React logs the error on purpose
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
    expect(log).toHaveBeenCalled()
  })

  it('starts fresh when it is given a new key, as the layout does for every page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function Host() {
      const [page, setPage] = useState(1)
      return (
        <>
          <button type="button" onClick={() => setPage(2)}>
            next page
          </button>
          <ErrorBoundary key={page}>{page === 1 ? <Broken /> : <p>second page</p>}</ErrorBoundary>
        </>
      )
    }
    render(<Host />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'next page' }))

    expect(screen.getByText('second page')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})