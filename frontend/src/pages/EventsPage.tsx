import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EventCard } from '../components/events/EventCard'
import { EventFilters } from '../components/events/EventFilters'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { useEventSearch } from '../hooks/useEventSearch'
import { buildSearch, EMPTY_FORM, PAGE_SIZE, readForm, readPage, SORT_OPTIONS } from '../lib/eventSearch'
import type { SearchFormValues } from '../lib/eventSearch'
import type { EventSort } from '../api/types'

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

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
        Events
      </h1>

      <div className="mt-4">
        <EventFilters key={searchString} initial={form} onApply={applyFilters} onClear={clearFilters} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600" aria-live="polite">
          {data && !error ? (data.totalElements === 0 ? 'No events found' : `Showing ${first}–${last} of ${data.totalElements} events`) : '\u00a0'}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-slate-700">
            Sort by
          </label>
          <select
            id="sort"
            value={form.sort}
            onChange={changeSort}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}

        {!error && loading && !data && <Spinner label="Loading events…" />}

        {!error && data && data.content.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-700">No events match your search.</p>
            <p className="mt-1 text-sm text-slate-500">Try different words, or remove some filters.</p>
            <Button variant="secondary" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}

        {!error && data && data.content.length > 0 && (
          <ul
            className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60 transition-opacity' : ''}`}
            aria-busy={loading}
          >
            {data.content.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}