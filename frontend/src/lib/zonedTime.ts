const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** True when the browser knows this IANA time zone (for example Asia/Kolkata). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone })
    return true
  } catch {
    return false
  }
}

/** How far the zone's wall clock is ahead of UTC at a given moment, in milliseconds (India: +5.5 hours). */
function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value)
  const wallAsUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000
}

/**
 * Turns what a person typed in a datetime-local field ("2027-01-10T19:00", a wall-clock time with no zone)
 * into the exact UTC moment it means in the given time zone. Returns null for anything that is not a real time.
 */
export function zonedLocalToUtcIso(local: string, timeZone: string): string | null {
  const match = LOCAL_PATTERN.exec(local)
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number]
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const check = new Date(wall)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) {
    return null
  }
  try {
    // The offset depends on the moment itself (daylight saving), so refine the first guess once.
    const firstGuess = wall - offsetMs(wall, timeZone)
    return new Date(wall - offsetMs(firstGuess, timeZone)).toISOString()
  } catch {
    return null
  }
}

/** The reverse: a UTC moment as "yyyy-MM-ddTHH:mm" wall-clock time in the zone, for filling a datetime-local field. */
export function utcIsoToZonedLocal(iso: string, timeZone: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) {
    return ''
  }
  try {
    return new Date(ms + offsetMs(ms, timeZone)).toISOString().slice(0, 16)
  } catch {
    return ''
  }
}