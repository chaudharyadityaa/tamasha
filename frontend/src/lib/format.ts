const LOCALE = 'en-IN'

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(amount)
}

/** Shows a moment in the venue's own time zone, whatever zone the visitor is in. */
export function formatDateTime(iso: string, timeZone: string): string {
  const date = new Date(iso)
  try {
    return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)
  }
}

/** For places that do not know the venue's time zone: shows the time in the visitor's own zone and says so. */
export function formatLocalDateTime(iso: string): string {
  const text = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  return `${text} (your local time)`
}

/** "Saturday, 10 January 2027, 7:00 pm – 10:00 pm" for one-day events, or both full dates otherwise. */
export function formatDateRange(startIso: string, endIso: string, timeZone: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  try {
    const day = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full', timeZone })
    const time = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', timeZone })
    if (day.format(start) === day.format(end)) {
      return `${day.format(start)}, ${time.format(start)} – ${time.format(end)}`
    }
  } catch {
    // Unknown time zone: fall back to UTC below.
    return `${formatDateTime(startIso, 'UTC')} – ${formatDateTime(endIso, 'UTC')}`
  }
  return `${formatDateTime(startIso, timeZone)} – ${formatDateTime(endIso, timeZone)}`
}