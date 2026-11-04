import { describe, expect, it } from 'vitest'
import { buildSearch, EMPTY_FORM, readForm, readPage, toApiParams, validateForm } from './eventSearch'

describe('eventSearch helpers', () => {
  it('turns URL parameters into API parameters, with a 0-based page', () => {
    const params = toApiParams(new URLSearchParams('q=jazz&city=Agra&sort=price_asc&page=3&minPrice=100&maxPrice=500'))

    expect(params).toMatchObject({ q: 'jazz', city: 'Agra', sort: 'price_asc', page: 2, size: 12, minPrice: 100, maxPrice: 500 })
  })

  it('uses defaults and ignores anything invalid in the URL', () => {
    const params = toApiParams(new URLSearchParams('sort=hack&page=-4&minPrice=abc&from=2026-13-45&maxPrice=-5'))

    expect(params.sort).toBe('date')
    expect(params.page).toBe(0)
    expect(params.minPrice).toBeUndefined()
    expect(params.maxPrice).toBeUndefined()
    expect(params.from).toBeUndefined()
    expect(readPage(new URLSearchParams('page=2.5'))).toBe(1)
  })

  it('converts a chosen day range into the local day boundaries as UTC instants', () => {
    const params = toApiParams(new URLSearchParams('from=2026-11-12&to=2026-11-12'))

    expect(params.from).toBe(new Date(2026, 10, 12).toISOString())
    expect(params.to).toBe(new Date(2026, 10, 13).toISOString()) // the last chosen day is included
  })

  it('writes short URLs: empty fields, the default sort and page 1 are left out', () => {
    expect(buildSearch({ ...EMPTY_FORM, q: ' jazz ' }).toString()).toBe('q=jazz')

    const search = buildSearch({ ...EMPTY_FORM, city: 'Agra', sort: 'price_desc', minPrice: '100' }, 2)

    expect(readForm(search)).toMatchObject({ city: 'Agra', sort: 'price_desc', minPrice: '100' })
    expect(readPage(search)).toBe(2)
  })

  it('catches reversed prices and dates and negative numbers', () => {
    expect(validateForm({ ...EMPTY_FORM, minPrice: '500', maxPrice: '100' }).maxPrice).toBeDefined()
    expect(validateForm({ ...EMPTY_FORM, fromDate: '2026-12-10', toDate: '2026-12-01' }).toDate).toBeDefined()
    expect(validateForm({ ...EMPTY_FORM, minPrice: '-1' }).minPrice).toBeDefined()
    expect(validateForm({ ...EMPTY_FORM, minPrice: '100', maxPrice: '500', fromDate: '2026-12-01', toDate: '2026-12-10' })).toEqual({})
  })
})