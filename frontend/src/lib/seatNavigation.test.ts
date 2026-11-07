import { beforeEach, describe, expect, it } from 'vitest'
import { neighbourSeat } from './seatNavigation'

const seat = (id: string) => document.getElementById(id) as HTMLElement

describe('neighbourSeat', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <div data-seat-row><button data-seat id="a1"></button><button data-seat id="a2"></button><button data-seat id="a3"></button></div>
        <div data-seat-row><button data-seat id="b1"></button><button data-seat id="b2"></button></div>
      </div>`
  })

  it('moves left and right inside a row, and to the ends with Home and End', () => {
    expect(neighbourSeat(seat('a2'), 'ArrowRight')).toBe(seat('a3'))
    expect(neighbourSeat(seat('a2'), 'ArrowLeft')).toBe(seat('a1'))
    expect(neighbourSeat(seat('a2'), 'Home')).toBe(seat('a1'))
    expect(neighbourSeat(seat('a2'), 'End')).toBe(seat('a3'))
    expect(neighbourSeat(seat('a3'), 'ArrowRight')).toBeNull()
    expect(neighbourSeat(seat('a1'), 'ArrowLeft')).toBeNull()
  })

  it('moves between rows and stays in range when rows have different lengths', () => {
    expect(neighbourSeat(seat('a1'), 'ArrowDown')).toBe(seat('b1'))
    expect(neighbourSeat(seat('a3'), 'ArrowDown')).toBe(seat('b2')) // the next row is shorter
    expect(neighbourSeat(seat('b2'), 'ArrowUp')).toBe(seat('a2'))
    expect(neighbourSeat(seat('a1'), 'ArrowUp')).toBeNull()
    expect(neighbourSeat(seat('b1'), 'ArrowDown')).toBeNull()
  })

  it('ignores other keys and elements that are not in a seat row', () => {
    document.body.innerHTML = '<button id="lonely"></button>'

    expect(neighbourSeat(seat('lonely'), 'ArrowRight')).toBeNull()
    document.body.innerHTML = '<div data-seat-row><button data-seat id="x"></button></div>'
    expect(neighbourSeat(seat('x'), 'a')).toBeNull()
  })
})