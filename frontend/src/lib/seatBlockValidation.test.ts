import { describe, expect, it } from 'vitest'
import { EMPTY_SEAT_BLOCK_FORM, parseRows, toSeatBlockInput, validateSeatBlock } from './seatBlockValidation'

const valid = { section: 'VIP', rows: 'A-C', seatsPerRow: '10' }

describe('parseRows', () => {
  it('expands ranges and lists, separated by commas or spaces', () => {
    expect(parseRows('A-C, F')).toEqual({ rows: ['A', 'B', 'C', 'F'] })
    expect(parseRows('1-3')).toEqual({ rows: ['1', '2', '3'] })
    expect(parseRows('a-c')).toEqual({ rows: ['a', 'b', 'c'] })
    expect(parseRows('A B  AA, B1')).toEqual({ rows: ['A', 'B', 'AA', 'B1'] })
  })

  it('explains what is wrong with a bad entry', () => {
    expect(parseRows('')).toEqual({ error: 'Enter at least one row, for example A-F or A, B, C.' })
    expect(parseRows('C-A')).toHaveProperty('error')
    expect(parseRows('A-c')).toHaveProperty('error') // mixed case in one range
    expect(parseRows('10-2')).toHaveProperty('error')
    expect(parseRows('A!')).toHaveProperty('error')
  })

  it('refuses duplicate rows and too many rows', () => {
    expect(parseRows('A, a')).toEqual({ error: 'Row "a" is listed twice.' })
    expect(parseRows('A-C, B')).toEqual({ error: 'Row "B" is listed twice.' })
    expect(parseRows('A-Z, 1-100')).toEqual({ error: 'Use at most 100 rows at a time.' })
  })
})

describe('seat block validation', () => {
  it('accepts a complete form and builds the request', () => {
    expect(validateSeatBlock(valid)).toEqual({})
    expect(toSeatBlockInput({ ...valid, section: ' VIP ' })).toEqual({ section: 'VIP', rows: ['A', 'B', 'C'], seatsPerRow: 10 })
  })

  it('asks for every field', () => {
    const errors = validateSeatBlock(EMPTY_SEAT_BLOCK_FORM)

    expect(Object.keys(errors).sort()).toEqual(['rows', 'seatsPerRow', 'section'])
  })

  it('checks the seats per row and the section length', () => {
    expect(validateSeatBlock({ ...valid, seatsPerRow: '0' }).seatsPerRow).toBeDefined()
    expect(validateSeatBlock({ ...valid, seatsPerRow: '201' }).seatsPerRow).toBeDefined()
    expect(validateSeatBlock({ ...valid, seatsPerRow: '2.5' }).seatsPerRow).toBeDefined()
    expect(validateSeatBlock({ ...valid, section: 'x'.repeat(51) }).section).toBeDefined()
  })

  it('refuses to build a request from rows that cannot be parsed', () => {
    expect(() => toSeatBlockInput({ ...valid, rows: 'C-A' })).toThrow()
  })
})