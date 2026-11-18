import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetWarmUp, startWarmUp } from '../../api/warmUp'
import { WakeUpNotice } from './WakeUpNotice'

function pending() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })

describe('WakeUpNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetWarmUp()
  })

  afterEach(() => {
    resetWarmUp()
    vi.useRealTimers()
  })

  it('shows nothing before a warm-up starts, and nothing while a quick one is under way', async () => {
    const { container } = render(<WakeUpNotice />)
    expect(container).toBeEmptyDOMElement()

    const probe = pending()
    await act(async () => {
      void startWarmUp(() => probe.promise)
    })
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    expect(container).toBeEmptyDOMElement()
  })

  it('explains the wait once it gets long, and goes away when the server is ready', async () => {
    const { container } = render(<WakeUpNotice />)
    const probe = pending()
    await act(async () => {
      void startWarmUp(() => probe.promise)
    })

    await act(async () => { await vi.advanceTimersByTimeAsync(2_500) })
    expect(screen.getByRole('status')).toHaveTextContent('Waking up the demo server')

    probe.resolve()
    await settle()
    expect(container).toBeEmptyDOMElement()
  })

  it('says the server cannot be reached when the warm-up gives up', async () => {
    render(<WakeUpNotice />)
    await act(async () => {
      void startWarmUp(() => Promise.reject(new Error('down')))
    })
    await settle()

    expect(screen.getByRole('alert')).toHaveTextContent('We could not reach the server.')
  })

  it('tries again when the button is pressed', async () => {
    const probe = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(undefined)
    render(<WakeUpNotice />)
    await act(async () => {
      void startWarmUp(probe)
    })
    await settle()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(probe).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})