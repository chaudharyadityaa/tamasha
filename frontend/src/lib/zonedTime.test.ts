import { describe, expect, it } from 'vitest'
import { isValidTimeZone, utcIsoToZonedLocal, zonedLocalToUtcIso } from './zonedTime'

describe('zonedTime', () => {
  it('converts a wall-clock time in India (UTC+5:30) to UTC', () => {
    expect(zonedLocalToUtcIso('2027-01-10T19:00', 'Asia/Kolkata')).toBe('2027-01-10T13:30:00.000Z')
  })

  it('respects daylight saving: New York is UTC-5 in winter and UTC-4 in summer', () => {
    expect(zonedLocalToUtcIso('2027-01-10T19:00', 'America/New_York')).toBe('2027-01-11T00:00:00.000Z')
    expect(zonedLocalToUtcIso('2027-07-10T19:00', 'America/New_York')).toBe('2027-07-10T23:00:00.000Z')
  })

  it('converts back to the same wall-clock time (a round trip)', () => {
    expect(utcIsoToZonedLocal('2027-01-10T13:30:00Z', 'Asia/Kolkata')).toBe('2027-01-10T19:00')
    expect(utcIsoToZonedLocal('2027-07-10T23:00:00Z', 'America/New_York')).toBe('2027-07-10T19:00')
  })

  it('rejects text that is not a real date and time', () => {
    expect(zonedLocalToUtcIso('', 'Asia/Kolkata')).toBeNull()
    expect(zonedLocalToUtcIso('2027-02-30T10:00', 'Asia/Kolkata')).toBeNull()
    expect(zonedLocalToUtcIso('2027-01-10T25:00', 'Asia/Kolkata')).toBeNull()
    expect(zonedLocalToUtcIso('2027-01-10T19:00', 'Not/AZone')).toBeNull()
    expect(utcIsoToZonedLocal('nonsense', 'Asia/Kolkata')).toBe('')
  })

  it('knows which time zone names are real', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true)
    expect(isValidTimeZone('Asia/Kolkatta')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })
})