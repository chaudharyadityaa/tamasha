import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSeatMap } from '../../test/fixtures'
import { SeatSectionGrid } from './SeatSectionGrid'

const vip = makeSeatMap().sections[0]!

function renderGrid(options: { selected?: number[]; sectionRoom?: number; overallRoom?: number; onToggle?: () => void } = {}) {
  const onToggle = options.onToggle ?? vi.fn()
  render(
    <SeatSectionGrid
      section={vip}
      currency="INR"
      selectedIds={new Set(options.selected ?? [])}
      sectionRoom={options.sectionRoom ?? 2}
      overallRoom={options.overallRoom ?? 20}
      onToggle={onToggle}
    />,
  )
  return onToggle
}

describe('SeatSectionGrid', () => {
  it('gives every seat a full spoken name that includes its state', () => {
    renderGrid({ selected: [102] })

    expect(screen.getByRole('button', { name: /VIP, row A, seat 1, .*2,500.*, available/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /row A, seat 2, .*selected/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /row B, seat 1, .*held by another customer/ })).toBeInTheDocument()
  })

  it('selects and unselects available seats but ignores held ones', async () => {
    const onToggle = renderGrid({ selected: [102] })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /row A, seat 1,/ }))
    await user.click(screen.getByRole('button', { name: /row A, seat 2,/ }))
    await user.click(screen.getByRole('button', { name: /row B, seat 1,/ })) // held: nothing happens

    expect(onToggle).toHaveBeenCalledTimes(2)
    expect(onToggle).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 101 }))
    expect(onToggle).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 102 }))
  })

  it('stops offering more seats once the limit is reached, but still lets selected seats be removed', async () => {
    const onToggle = renderGrid({ selected: [101, 102], sectionRoom: 0 })
    const user = userEvent.setup()

    const third = screen.getByRole('button', { name: /row A, seat 3,/ })
    expect(third).toHaveAttribute('aria-disabled', 'true')
    expect(third).toHaveAccessibleName(/selection limit reached/)
    await user.click(third)
    expect(onToggle).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /row A, seat 1,/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('is a single Tab stop and moves between seats with the arrow keys', async () => {
    renderGrid()
    const user = userEvent.setup()
    const tabStops = screen.getAllByRole('button').filter((button) => button.getAttribute('tabindex') === '0')
    expect(tabStops).toHaveLength(1)

    await user.tab()
    expect(screen.getByRole('button', { name: /row A, seat 1,/ })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /row A, seat 2,/ })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /row B, seat 1,/ })).toHaveFocus() // held seats stay reachable
  })
})