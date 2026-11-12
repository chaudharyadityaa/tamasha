import { describe, expect, it } from 'vitest'
import { dateBadge } from './eventDate'

describe('dateBadge', () => {
  it('shows the day in the venue time zone', () => {
    const badge = dateBadge('2027-01-10T13:30:00Z', 'Asia/Kolkata')

    expect(badge.day).toBe('10')
    expect(badge.month).toBe('Jan')
    expect(badge.weekday).toBe('Sun')
    expect(badge.time).toContain('7:00')
  })

  it('moves to the next day when the venue is ahead of UTC', () => {
    expect(dateBadge('2027-01-10T20:00:00Z', 'Asia/Kolkata').day).toBe('11')
    expect(dateBadge('2027-01-10T20:00:00Z', 'UTC').day).toBe('10')
  })

  it('falls back to UTC for an unknown time zone instead of failing', () => {
    expect(dateBadge('2027-01-10T13:30:00Z', 'Not/AZone').time).toContain('1:30')
  })
})