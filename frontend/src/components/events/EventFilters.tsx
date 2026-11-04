import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { validateForm } from '../../lib/eventSearch'
import type { FormErrors, SearchFormValues } from '../../lib/eventSearch'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'

const CATEGORY_SUGGESTIONS = ['Music', 'Sports', 'Theatre', 'Comedy', 'Conference', 'Festival', 'Workshop']

interface EventFiltersProps {
  /** What the URL currently says. Give this component a new `key` when the URL changes to reset the form. */
  initial: SearchFormValues
  onApply: (values: SearchFormValues) => void
  onClear: () => void
}

export function EventFilters({ initial, onApply, onClear }: EventFiltersProps) {
  const [draft, setDraft] = useState<SearchFormValues>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const suggestionsId = useId()

  function change<K extends keyof SearchFormValues>(key: K, value: SearchFormValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateForm(draft)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      onApply(draft)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <TextField
            label="Search"
            type="search"
            maxLength={100}
            placeholder="Event name"
            value={draft.q}
            onChange={(event) => change('q', event.target.value)}
          />
        </div>
        <div>
          <TextField
            label="Category"
            list={suggestionsId}
            maxLength={50}
            value={draft.category}
            onChange={(event) => change('category', event.target.value)}
          />
          <datalist id={suggestionsId}>
            {CATEGORY_SUGGESTIONS.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
        <TextField
          label="City"
          maxLength={100}
          value={draft.city}
          onChange={(event) => change('city', event.target.value)}
        />
        <TextField
          label="From date"
          type="date"
          value={draft.fromDate}
          onChange={(event) => change('fromDate', event.target.value)}
        />
        <TextField
          label="To date"
          type="date"
          value={draft.toDate}
          onChange={(event) => change('toDate', event.target.value)}
          error={errors.toDate}
        />
        <TextField
          label="Min price"
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={draft.minPrice}
          onChange={(event) => change('minPrice', event.target.value)}
          error={errors.minPrice}
        />
        <TextField
          label="Max price"
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={draft.maxPrice}
          onChange={(event) => change('maxPrice', event.target.value)}
          error={errors.maxPrice}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit">Apply filters</Button>
        <Button variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}