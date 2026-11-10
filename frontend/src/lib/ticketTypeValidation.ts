import type { OrganizerTicketTypeInput } from '../api/organizerInventoryTypes'
import type { SeatingMode } from '../api/types'
import type { FieldErrors } from './organizerValidation'
import { zonedLocalToUtcIso } from './zonedTime'

export interface TicketTypeFormValues {
  name: string
  price: string
  quantityTotal: string
  seatSection: string
  maxPerBooking: string
  /** Wall-clock times in the VENUE's time zone (datetime-local values). Both are optional. */
  salesStartLocal: string
  salesEndLocal: string
}

export const EMPTY_TICKET_TYPE_FORM: TicketTypeFormValues = {
  name: '',
  price: '',
  quantityTotal: '',
  seatSection: '',
  maxPerBooking: '',
  salesStartLocal: '',
  salesEndLocal: '',
}

export type TicketTypeField = keyof TicketTypeFormValues

// The names the server uses (the form calls the two sales times salesStartLocal / salesEndLocal).
export const TICKET_TYPE_SERVER_FIELDS = [
  'name',
  'price',
  'quantityTotal',
  'seatSection',
  'maxPerBooking',
  'salesStart',
  'salesEnd',
] as const

const PRICE = /^\d+(\.\d{1,2})?$/
const WHOLE_NUMBER = /^\d+$/
// One booking can hold at most 20 tickets, so a larger per-booking limit would mean nothing.
const MAX_PER_BOOKING_LIMIT = 20

/** Checks simple input mistakes. Business rules (capacity, event state, ...) are the server's job. */
export function validateTicketType(
  values: TicketTypeFormValues,
  seatingMode: SeatingMode,
  timeZone: string,
): FieldErrors<TicketTypeField> {
  const errors: FieldErrors<TicketTypeField> = {}

  if (!values.name.trim()) {
    errors.name = 'Enter a name.'
  }
  if (!PRICE.test(values.price.trim())) {
    errors.price = 'Enter a price of 0 or more, with at most 2 decimals.'
  }

  if (seatingMode === 'GENERAL_ADMISSION') {
    const quantity = values.quantityTotal.trim()
    if (!WHOLE_NUMBER.test(quantity) || Number(quantity) < 1) {
      errors.quantityTotal = 'Enter a whole number of 1 or more.'
    }
  } else if (!values.seatSection) {
    errors.seatSection = 'Choose a seat section.'
  }

  const perBooking = values.maxPerBooking.trim()
  if (perBooking && (!WHOLE_NUMBER.test(perBooking) || Number(perBooking) < 1 || Number(perBooking) > MAX_PER_BOOKING_LIMIT)) {
    errors.maxPerBooking = `Enter a whole number from 1 to ${MAX_PER_BOOKING_LIMIT}.`
  }

  const start = values.salesStartLocal ? zonedLocalToUtcIso(values.salesStartLocal, timeZone) : null
  const end = values.salesEndLocal ? zonedLocalToUtcIso(values.salesEndLocal, timeZone) : null
  if (values.salesStartLocal && !start) {
    errors.salesStartLocal = 'This is not a valid date and time.'
  }
  if (values.salesEndLocal && !end) {
    errors.salesEndLocal = 'This is not a valid date and time.'
  }
  if (start && end && Date.parse(end) <= Date.parse(start)) {
    errors.salesEndLocal = 'Sales must close after they open.'
  }
  return errors
}

/** Builds the request. Fields that do not apply to the seating mode, or were left empty, are left out. */
export function toTicketTypeInput(
  values: TicketTypeFormValues,
  seatingMode: SeatingMode,
  timeZone: string,
): OrganizerTicketTypeInput {
  const input: OrganizerTicketTypeInput = {
    name: values.name.trim(),
    price: Number(values.price.trim()),
  }
  if (seatingMode === 'GENERAL_ADMISSION') {
    input.quantityTotal = Number(values.quantityTotal.trim())
  } else {
    input.seatSection = values.seatSection
  }
  if (values.maxPerBooking.trim()) {
    input.maxPerBooking = Number(values.maxPerBooking.trim())
  }
  const start = values.salesStartLocal ? zonedLocalToUtcIso(values.salesStartLocal, timeZone) : null
  const end = values.salesEndLocal ? zonedLocalToUtcIso(values.salesEndLocal, timeZone) : null
  if (start) {
    input.salesStart = start
  }
  if (end) {
    input.salesEnd = end
  }
  return input
}