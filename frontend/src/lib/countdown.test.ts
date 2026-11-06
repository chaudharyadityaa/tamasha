import { describe, expect, it } from 'vitest'
import { formatCountdown } from './countdown'

describe('formatCountdown', () => {
  it('shows minutes and seconds', () => {
    expect(formatCountdown(845)).toBe('14:05')
    expect(formatCountdown(59)).toBe('0:59')
  })

  it('shows hours when there are some, and never goes negative', () => {
    expect(formatCountdown(3725)).toBe('1:02:05')
    expect(formatCountdown(-30)).toBe('0:00')
  })
})