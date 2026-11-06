import { describe, expect, it } from 'vitest'
import { sumLines } from './money'

describe('sumLines', () => {
  it('adds prices exactly, without floating point noise', () => {
    expect(sumLines([{ price: 0.1, quantity: 1 }, { price: 0.2, quantity: 1 }])).toBe(0.3)
    expect(sumLines([{ price: 499.5, quantity: 3 }, { price: 100.1, quantity: 2 }])).toBe(1698.7)
  })

  it('is zero for no lines', () => {
    expect(sumLines([])).toBe(0)
  })
})