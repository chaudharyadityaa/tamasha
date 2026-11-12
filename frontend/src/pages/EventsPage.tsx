import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { EventSort } from '../api/types'
import { EventCard } from '../components/events/EventCard'
import { EventFilters } from '../components/events/EventFilters'
import { PageBand } from '../components/layout/PageBand'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { useEventSearch } from '../hooks/useEventSearch'
import { buildSearch, EMPTY_FORM, PAGE_SIZE, readForm, readPage, SORT_OPTIONS } from '../lib/eventSearch'
import type { SearchFormValues } from '../lib/eventSearch'
import { HOME_CATEGORIES } from '../lib/homeCategories'

const toQuery = (params: URLSearchParams) => {
  const text = params.toString()
  return text ? `?${text}` : ''
}

const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchString = searchParams.toString()
  const [reloads, setReloads] = useState(0)
  const { data, loading, error } = useEventSearch(searchString, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const form = readForm(searchParams)
  const page = readPage(searchParams)

  function applyFilters(values: SearchFormValues) {
    setSearchParams(buildSearch({ ...values, sort: form.sort }, 1))
  }

  function clearFilters() {
    setSearchParams(buildSearch({ ...EMPTY_FORM, sort: form.sort }, 1))
  }

  function changeSort(event: ChangeEvent<HTMLSelectElement>) {
    setSearchParams(buildSearch({ ...form, sort: event.target.value as EventSort }, 1))
  }

  function goToPage(next: number) {
    setSearchParams(buildSearch(form, next))
    headingRef.current?.focus() // keyboard and screen-reader users land at the top of the new results
  }

  const first = data && data.totalElements > 0 ? data.page * PAGE_SIZE + 1 : 0
  const last = data ? data.page * PAGE_SIZE + data.content.length : 0

  const pills = [{ label: 'All', value: '' }, ...HOME_CATEGORIES.map((category) => ({ label: category, value: category }))]

  return (
    <div>
      <PageBand
        title="Find your night"
        subtitle="Search by name, kind of event, city, date or price."
        headingRef={headingRef}
      >
        <EventFilters key={searchString} initial={form} onApply={applyFilters} onClear={clearFilters} />
      </PageBand>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav aria-label="Kinds of event">
          <ul className="flex flex-wrap gap-2">
            {pills.map((pill) => {
              const active = pill.value === '' ? form.category === '' : form.category.toLowerCase() === pill.value.toLowerCase()
              return (
                <li key={pill.label}>
                  <Link
                    to={{ pathname: '/events', search: toQuery(buildSearch({ ...form, category: pill.value }, 1)) }}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                      active ? 'bg-midnight text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600" aria-live="polite">
            {data && !error
              ? data.totalElements === 0
                ? 'No events found'
                : `Showing ${first}–${last} of ${data.totalElements} events`
              : '\u00a0'}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-slate-700">
              Sort by
            </label>
            <select
              id="sort"
              value={form.sort}
              onChange={changeSort}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {error && (
            <div className="space-y-3">
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
                Try again
              </Button>
            </div>
          )}

          {!error && loading && !data && (
            <>
              <p role="status" className="sr-only">
                Loading events
              </p>
              <ul aria-hidden="true" className={GRID}>
                {Array.from({ length: 8 }, (_, index) => (
                  <li key={index} className="aspect-[3/5] animate-pulse rounded-md bg-slate-200" />
                ))}
              </ul>
            </>
          )}

          {!error && data && data.content.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-display text-2xl font-bold text-slate-900">No events match your search.</p>
              <p className="mt-2 text-slate-600">Try different words, or remove some filters.</p>
              <Button variant="secondary" className="mt-5" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}

          {!error && data && data.content.length > 0 && (
            <ul className={`${GRID} ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
              {data.content.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
          )}

          {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
        </div>
      </div>
    </div>
  )
}