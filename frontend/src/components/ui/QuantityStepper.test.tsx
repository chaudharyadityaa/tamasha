import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('increases and decreases by one', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper label="Standing quantity" value={1} max={3} onChange={onChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Increase Standing quantity' }))
    await user.click(screen.getByRole('button', { name: 'Decrease Standing quantity' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 2)
    expect(onChange).toHaveBeenNthCalledWith(2, 0)
  })

  it('cannot go above the maximum', () => {
    render(<QuantityStepper label="Standing quantity" value={3} max={3} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Increase Standing quantity' })).toBeDisabled()
  })

  it('cannot go below the minimum', () => {
    render(<QuantityStepper label="Standing quantity" value={0} max={3} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Decrease Standing quantity' })).toBeDisabled()
  })
})