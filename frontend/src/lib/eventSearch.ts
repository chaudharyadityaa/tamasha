import type { EventSearchParams, EventSort } from '../api/types'

export const PAGE_SIZE = 12

export const SORT_OPTIONS: { value: EventSort; label: string }[] = [
  { value: 'date', label: 'Soonest first' },
  { value: 'date_desc', label: 'Latest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Recently added' },
]

const DEFAULT_SORT: EventSort = 'date'

/** The values shown in the filter form. Dates are yyyy-MM-dd (the visitor's local day), prices are text. */
export interface SearchFormValues {
  q: string
  category: string
  city: string
  fromDate: string
  toDate: string
  minPrice: string
  maxPrice: string
  sort: EventSort
}

export const EMPTY_FORM: SearchFormValues = {
  q: '',
  category: '',
  city: '',
  fromDate: '',
  toDate: '',
  minPrice: '',
  maxPrice: '',
  sort: DEFAULT_SORT,
}

export type FormErrors = Partial<Record<'minPrice' | 'maxPrice' | 'toDate', string>>

function isSort(value: string | null): value is EventSort {
  return SORT_OPTIONS.some((option) => option.value === value)
}

/** Parses yyyy-MM-dd into a local date, or null if it is not a real calendar day. */
function parseLocalDay(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(year, month - 1, day)
  const real = check.getFullYear() === year && check.getMonth() === month - 1 && check.getDate() === day
  return real ? { year, month, day } : null
}

function validDay(value: string): string {
  return parseLocalDay(value) ? value : ''
}

function validPrice(value: string): string {
  if (value === '') {
    return ''
  }
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? value : ''
}

function text(search: URLSearchParams, key: string): string {
  return (search.get(key) ?? '').trim()
}

/** Reads the filter form values from the URL, ignoring anything invalid. */
export function readForm(search: URLSearchParams): SearchFormValues {
  const sort = search.get('sort')
  return {
    q: text(search, 'q'),
    category: text(search, 'category'),
    city: text(search, 'city'),
    fromDate: validDay(text(search, 'from')),
    toDate: validDay(text(search, 'to')),
    minPrice: validPrice(text(search, 'minPrice')),
    maxPrice: validPrice(text(search, 'maxPrice')),
    sort: isSort(sort) ? sort : DEFAULT_SORT,
  }
}

/** The page number in the URL is 1-based. Anything that is not a whole number of 1 or more means page 1. */
export function readPage(search: URLSearchParams): number {
  const page = Number(search.get('page'))
  return Number.isInteger(page) && page >= 1 ? page : 1
}

/** Builds the URL query for a form. Empty fields, the default sort and page 1 are left out to keep URLs short. */
export function buildSearch(form: SearchFormValues, page = 1): URLSearchParams {
  const search = new URLSearchParams()
  const entries: [string, string][] = [
    ['q', form.q.trim()],
    ['category', form.category.trim()],
    ['city', form.city.trim()],
    ['from', form.fromDate],
    ['to', form.toDate],
    ['minPrice', form.minPrice],
    ['maxPrice', form.maxPrice],
  ]
  for (const [key, value] of entries) {
    if (value !== '') {
      search.set(key, value)
    }
  }
  if (form.sort !== DEFAULT_SORT) {
    search.set('sort', form.sort)
  }
  if (page > 1) {
    search.set('page', String(page))
  }
  return search
}

/** The start of a local calendar day (plus optional extra days) as the UTC instant the API expects. */
function localDayStartIso(value: string, extraDays = 0): string {
  const parts = parseLocalDay(value)
  if (!parts) {
    throw new Error('Not a valid day: ' + value)
  }
  return new Date(parts.year, parts.month - 1, parts.day + extraDays).toISOString()
}

/** Turns the URL into the parameters for GET /api/events. */
export function toApiParams(search: URLSearchParams): EventSearchParams {
  const form = readForm(search)
  const params: EventSearchParams = {
    sort: form.sort,
    page: readPage(search) - 1,
    size: PAGE_SIZE,
  }
  if (form.q) {
    params.q = form.q
  }
  if (form.category) {
    params.category = form.category
  }
  if (form.city) {
    params.city = form.city
  }
  if (form.fromDate) {
    params.from = localDayStartIso(form.fromDate)
  }
  if (form.toDate) {
    params.to = localDayStartIso(form.toDate, 1) // the chosen last day is included
  }
  if (form.minPrice) {
    params.minPrice = Number(form.minPrice)
  }
  if (form.maxPrice) {
    params.maxPrice = Number(form.maxPrice)
  }
  return params
}

/** Checks what the user typed in the filter form (the server validates again). */
export function validateForm(form: SearchFormValues): FormErrors {
  const errors: FormErrors = {}
  const min = form.minPrice === '' ? null : Number(form.minPrice)
  const max = form.maxPrice === '' ? null : Number(form.maxPrice)

  if (min !== null && (!Number.isFinite(min) || min < 0)) {
    errors.minPrice = 'Enter a number of 0 or more.'
  }
  if (max !== null && (!Number.isFinite(max) || max < 0)) {
    errors.maxPrice = 'Enter a number of 0 or more.'
  } else if (min !== null && max !== null && Number.isFinite(min) && min > max) {
    errors.maxPrice = 'The maximum must be at least the minimum.'
  }
  if (form.fromDate && form.toDate && form.toDate < form.fromDate) {
    errors.toDate = 'The end date must be on or after the start date.'
  }
  return errors
}