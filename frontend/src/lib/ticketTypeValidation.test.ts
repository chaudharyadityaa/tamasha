import { describe, expect, it } from 'vitest'
import { EMPTY_TICKET_TYPE_FORM, toTicketTypeInput, validateTicketType } from './ticketTypeValidation'

const general = { ...EMPTY_TICKET_TYPE_FORM, name: 'Standing', price: '499.50', quantityTotal: '50' }
const reserved = { ...EMPTY_TICKET_TYPE_FORM, name: 'VIP', price: '2500', seatSection: 'VIP' }

describe('ticket type validation', () => {
  it('accepts a complete general-admission or reserved-seating ticket type', () => {
    expect(validateTicketType(general, 'GENERAL_ADMISSION', 'Asia/Kolkata')).toEqual({})
    expect(validateTicketType(reserved, 'RESERVED_SEATING', 'Asia/Kolkata')).toEqual({})
  })

  it('asks for what each seating mode needs: a quantity, or a seat section', () => {
    expect(validateTicketType({ ...general, quantityTotal: '' }, 'GENERAL_ADMISSION', 'Asia/Kolkata').quantityTotal).toBeDefined()
    expect(validateTicketType({ ...general, quantityTotal: '0' }, 'GENERAL_ADMISSION', 'Asia/Kolkata').quantityTotal).toBeDefined()
    expect(validateTicketType({ ...reserved, seatSection: '' }, 'RESERVED_SEATING', 'Asia/Kolkata').seatSection).toBeDefined()
  })

  it('checks the name, the price (money with at most 2 decimals) and the per-booking limit', () => {
    const errors = validateTicketType({ ...general, name: ' ', price: '10.999', maxPerBooking: '21' }, 'GENERAL_ADMISSION', 'Asia/Kolkata')

    expect(Object.keys(errors).sort()).toEqual(['maxPerBooking', 'name', 'price'])
    expect(validateTicketType({ ...general, price: '0' }, 'GENERAL_ADMISSION', 'Asia/Kolkata').price).toBeUndefined()
    expect(validateTicketType({ ...general, price: '-5' }, 'GENERAL_ADMISSION', 'Asia/Kolkata').price).toBeDefined()
  })

  it('requires sales to close after they open', () => {
    const errors = validateTicketType(
      { ...general, salesStartLocal: '2027-01-05T10:00', salesEndLocal: '2027-01-04T10:00' },
      'GENERAL_ADMISSION',
      'Asia/Kolkata',
    )

    expect(errors.salesEndLocal).toBe('Sales must close after they open.')
  })

  it('builds the request: the quantity for general admission, the section for reserved, times in UTC, empties left out', () => {
    expect(toTicketTypeInput(general, 'GENERAL_ADMISSION', 'Asia/Kolkata')).toEqual({
      name: 'Standing',
      price: 499.5,
      quantityTotal: 50,
    })
    expect(
      toTicketTypeInput(
        { ...reserved, maxPerBooking: '2', salesStartLocal: '2027-01-05T10:00', salesEndLocal: '2027-01-10T18:00' },
        'RESERVED_SEATING',
        'Asia/Kolkata',
      ),
    ).toEqual({
      name: 'VIP',
      price: 2500,
      seatSection: 'VIP',
      maxPerBooking: 2,
      salesStart: '2027-01-05T04:30:00.000Z',
      salesEnd: '2027-01-10T12:30:00.000Z',
    })
  })
})