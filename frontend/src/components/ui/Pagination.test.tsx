import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('marks the current page and moves to the next page', async () => {
    const onChange = vi.fn()
    render(<Pagination page={2} totalPages={5} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    await userEvent.setup().click(screen.getByRole('button', { name: /next/i }))

    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()

    rerender(<Pagination page={3} totalPages={3} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('shows nothing when everything fits on one page', () => {
    render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />)

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})