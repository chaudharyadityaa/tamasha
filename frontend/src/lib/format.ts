export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

/** Shows the event time in the venue's own time zone, whatever zone the visitor is in. */
export function formatDateTime(iso: string, timeZone: string): string {
  const date = new Date(iso)
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)
  }
}