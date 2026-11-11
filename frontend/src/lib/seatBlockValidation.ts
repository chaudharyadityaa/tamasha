import type { SeatBlockInput } from '../api/organizerOperationsTypes'
import type { FieldErrors } from './organizerValidation'

export interface SeatBlockFormValues {
  section: string
  /** For example "A-F", "A, B, C", "1-10" or a mix. */
  rows: string
  seatsPerRow: string
}

export const EMPTY_SEAT_BLOCK_FORM: SeatBlockFormValues = { section: '', rows: '', seatsPerRow: '' }

export type SeatBlockField = keyof SeatBlockFormValues

export const SEAT_BLOCK_SERVER_FIELDS = ['section', 'rows', 'seatsPerRow'] as const

// Sanity limits to stop a typo from expanding into thousands of seats. The server enforces the real limits.
const MAX_ROWS = 100
const MAX_SEATS_PER_ROW = 200
const MAX_SECTION_LENGTH = 50

const isUpper = (code: number) => code >= 65 && code <= 90

/** Turns "A-C, F" into ["A", "B", "C", "F"], or explains what is wrong. */
export function parseRows(text: string): { rows: string[] } | { error: string } {
  const tokens = text.split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) {
    return { error: 'Enter at least one row, for example A-F or A, B, C.' }
  }

  const rows: string[] = []
  for (const token of tokens) {
    const letters = /^([A-Za-z])-([A-Za-z])$/.exec(token)
    const numbers = /^(\d{1,3})-(\d{1,3})$/.exec(token)
    if (letters) {
      const from = letters[1]!.charCodeAt(0)
      const to = letters[2]!.charCodeAt(0)
      if (to < from || isUpper(from) !== isUpper(to)) {
        return { error: `"${token}" is not a valid range. Use the same case, in order, such as A-F.` }
      }
      for (let code = from; code <= to; code += 1) {
        rows.push(String.fromCharCode(code))
      }
    } else if (numbers) {
      const from = Number(numbers[1])
      const to = Number(numbers[2])
      if (to < from) {
        return { error: `"${token}" is not a valid range. Write it in order, such as 1-10.` }
      }
      for (let number = from; number <= to; number += 1) {
        rows.push(String(number))
      }
    } else if (/^[A-Za-z0-9]{1,10}$/.test(token)) {
      rows.push(token)
    } else {
      return { error: `"${token}" is not a valid row name. Use letters or numbers, up to 10 characters.` }
    }
    if (rows.length > MAX_ROWS) {
      return { error: `Use at most ${MAX_ROWS} rows at a time.` }
    }
  }

  const seen = new Set<string>()
  for (const row of rows) {
    const key = row.toLowerCase()
    if (seen.has(key)) {
      return { error: `Row "${row}" is listed twice.` }
    }
    seen.add(key)
  }
  return { rows }
}

export function validateSeatBlock(values: SeatBlockFormValues): FieldErrors<SeatBlockField> {
  const errors: FieldErrors<SeatBlockField> = {}
  const section = values.section.trim()
  if (!section) {
    errors.section = 'Enter a section name, for example VIP.'
  } else if (section.length > MAX_SECTION_LENGTH) {
    errors.section = `Use at most ${MAX_SECTION_LENGTH} characters.`
  }

  const parsed = parseRows(values.rows)
  if ('error' in parsed) {
    errors.rows = parsed.error
  }

  const perRow = values.seatsPerRow.trim()
  if (!/^\d+$/.test(perRow) || Number(perRow) < 1 || Number(perRow) > MAX_SEATS_PER_ROW) {
    errors.seatsPerRow = `Enter a whole number from 1 to ${MAX_SEATS_PER_ROW}.`
  }
  return errors
}

/** Builds the request. Validate first: this throws for rows that cannot be parsed. */
export function toSeatBlockInput(values: SeatBlockFormValues): SeatBlockInput {
  const parsed = parseRows(values.rows)
  if ('error' in parsed) {
    throw new Error(parsed.error)
  }
  return {
    section: values.section.trim(),
    rows: parsed.rows,
    seatsPerRow: Number(values.seatsPerRow.trim()),
  }
}