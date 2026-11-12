export interface DateBadge {
  day: string
  month: string
  weekday: string
  time: string
}

function build(date: Date, timeZone: string): DateBadge {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    day: get('day'),
    month: get('month'),
    weekday: get('weekday'),
    time: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`.trim(),
  }
}

/** The pieces of an event's start for a calendar-style badge, in the venue's own time zone. */
export function dateBadge(iso: string, timeZone: string): DateBadge {
  const date = new Date(iso)
  try {
    return build(date, timeZone)
  } catch {
    return build(date, 'UTC')
  }
}