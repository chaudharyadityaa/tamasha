import { toApiError } from '../api/errors'
import type { CreateEventInput, OrganizerEvent, UpdateEventInput, VenueInput } from '../api/organizerTypes'
import type { SeatingMode } from '../api/types'
import { isValidTimeZone, utcIsoToZonedLocal, zonedLocalToUtcIso } from './zonedTime'

// ---------- shared ----------

export type FieldErrors<K extends string> = Partial<Record<K, string>>

const WHOLE_NUMBER = /^\d+$/

/** Picks the server's per-field messages (the 400 "errors" map) for the fields we have on screen. */
export function serverFieldErrors<K extends string>(error: unknown, keys: readonly K[]): FieldErrors<K> {
  const fromServer = toApiError(error).fieldErrors
  const found: FieldErrors<K> = {}
  for (const key of keys) {
    const message = fromServer[key]
    if (message) {
      found[key] = message
    }
  }
  return found
}

// ---------- venues ----------

export interface VenueFormValues {
  name: string
  addressLine: string
  city: string
  region: string
  country: string
  timeZone: string
  capacity: string
}

export const EMPTY_VENUE_FORM: VenueFormValues = {
  name: '',
  addressLine: '',
  city: '',
  region: '',
  country: '',
  timeZone: '',
  capacity: '',
}

export const VENUE_FIELDS = ['name', 'addressLine', 'city', 'region', 'country', 'timeZone', 'capacity'] as const
export type VenueField = (typeof VENUE_FIELDS)[number]

export function validateVenue(values: VenueFormValues): FieldErrors<VenueField> {
  const errors: FieldErrors<VenueField> = {}
  if (!values.name.trim()) {
    errors.name = 'Enter the venue name.'
  }
  if (!values.addressLine.trim()) {
    errors.addressLine = 'Enter the street address.'
  }
  if (!values.city.trim()) {
    errors.city = 'Enter the city.'
  }
  if (!values.country.trim()) {
    errors.country = 'Enter the country.'
  }
  if (!isValidTimeZone(values.timeZone.trim())) {
    errors.timeZone = 'Enter a valid time zone such as Asia/Kolkata.'
  }
  const capacity = values.capacity.trim()
  if (!WHOLE_NUMBER.test(capacity) || Number(capacity) < 1) {
    errors.capacity = 'Enter a whole number of 1 or more.'
  }
  return errors
}

/** Optional fields that were left empty are left out of the request instead of being sent as "". */
export function toVenueInput(values: VenueFormValues): VenueInput {
  const input: VenueInput = {
    name: values.name.trim(),
    addressLine: values.addressLine.trim(),
    city: values.city.trim(),
    country: values.country.trim(),
    timeZone: values.timeZone.trim(),
    capacity: Number(values.capacity),
  }
  if (values.region.trim()) {
    input.region = values.region.trim()
  }
  return input
}

// ---------- events ----------

export interface EventFormValues {
  venueId: string
  title: string
  description: string
  category: string
  imageUrl: string
  /** Wall-clock time in the VENUE's time zone, as a datetime-local value. */
  startsLocal: string
  endsLocal: string
  seatingMode: SeatingMode
  currency: string
  cancellationCutoffHours: string
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  venueId: '',
  title: '',
  description: '',
  category: '',
  imageUrl: '',
  startsLocal: '',
  endsLocal: '',
  seatingMode: 'GENERAL_ADMISSION',
  currency: 'INR',
  cancellationCutoffHours: '24',
}

export type EventField = keyof Omit<EventFormValues, 'seatingMode'>

export function validateEvent(
  values: EventFormValues,
  mode: 'create' | 'edit',
  timeZone: string | null,
): FieldErrors<EventField> {
  const errors: FieldErrors<EventField> = {}
  if (mode === 'create' && !values.venueId) {
    errors.venueId = 'Choose a venue.'
  }
  if (!values.title.trim()) {
    errors.title = 'Enter a title.'
  }
  if (!values.category.trim()) {
    errors.category = 'Enter a category.'
  }
  if (values.imageUrl.trim() && !/^https?:\/\//i.test(values.imageUrl.trim())) {
    errors.imageUrl = 'Enter a web address starting with http:// or https://.'
  }
  if (values.currency.trim() && !/^[A-Za-z]{3}$/.test(values.currency.trim())) {
    errors.currency = 'Use a 3-letter currency code such as INR.'
  }
  const cutoff = values.cancellationCutoffHours.trim()
  if (cutoff && !WHOLE_NUMBER.test(cutoff)) {
    errors.cancellationCutoffHours = 'Enter a whole number of hours (0 or more).'
  }

  if (!values.startsLocal) {
    errors.startsLocal = 'Choose when the event starts.'
  }
  if (!values.endsLocal) {
    errors.endsLocal = 'Choose when the event ends.'
  }
  if (timeZone && values.startsLocal && values.endsLocal) {
    const start = zonedLocalToUtcIso(values.startsLocal, timeZone)
    const end = zonedLocalToUtcIso(values.endsLocal, timeZone)
    if (!start) {
      errors.startsLocal = 'This is not a valid date and time.'
    }
    if (!end) {
      errors.endsLocal = 'This is not a valid date and time.'
    }
    if (start && end && Date.parse(end) <= Date.parse(start)) {
      errors.endsLocal = 'The end must be after the start.'
    }
  }
  return errors
}

function requireUtc(local: string, timeZone: string): string {
  const iso = zonedLocalToUtcIso(local, timeZone)
  if (!iso) {
    throw new Error('Invalid date and time: validate the form before building the request.')
  }
  return iso
}

export function toCreateEventInput(values: EventFormValues, timeZone: string): CreateEventInput {
  const input: CreateEventInput = {
    venueId: Number(values.venueId),
    title: values.title.trim(),
    category: values.category.trim(),
    startsAt: requireUtc(values.startsLocal, timeZone),
    endsAt: requireUtc(values.endsLocal, timeZone),
    seatingMode: values.seatingMode,
  }
  if (values.description.trim()) {
    input.description = values.description.trim()
  }
  if (values.imageUrl.trim()) {
    input.imageUrl = values.imageUrl.trim()
  }
  if (values.currency.trim()) {
    input.currency = values.currency.trim().toUpperCase()
  }
  if (values.cancellationCutoffHours.trim()) {
    input.cancellationCutoffHours = Number(values.cancellationCutoffHours)
  }
  return input
}

export function toUpdateEventInput(values: EventFormValues, timeZone: string): UpdateEventInput {
  const input: UpdateEventInput = {
    title: values.title.trim(),
    category: values.category.trim(),
    startsAt: requireUtc(values.startsLocal, timeZone),
    endsAt: requireUtc(values.endsLocal, timeZone),
  }
  if (values.description.trim()) {
    input.description = values.description.trim()
  }
  if (values.imageUrl.trim()) {
    input.imageUrl = values.imageUrl.trim()
  }
  if (values.cancellationCutoffHours.trim()) {
    input.cancellationCutoffHours = Number(values.cancellationCutoffHours)
  }
  return input
}

/** Fills the edit form: the stored UTC moments become wall-clock times in the venue's own zone. */
export function eventToFormValues(event: OrganizerEvent): EventFormValues {
  return {
    venueId: String(event.venue.id),
    title: event.title,
    description: event.description ?? '',
    category: event.category,
    imageUrl: event.imageUrl ?? '',
    startsLocal: utcIsoToZonedLocal(event.startsAt, event.venue.timeZone),
    endsLocal: utcIsoToZonedLocal(event.endsAt, event.venue.timeZone),
    seatingMode: event.seatingMode,
    currency: event.currency,
    cancellationCutoffHours: String(event.cancellationCutoffHours),
  }
}