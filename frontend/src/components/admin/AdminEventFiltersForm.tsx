import { useState } from 'react'
import type { FormEvent } from 'react'
import type { EventStatus } from '../../api/organizerTypes'
import { EMPTY_ADMIN_EVENT_FILTERS } from '../../lib/adminEventSearch'
import type { AdminEventFilters } from '../../lib/adminEventSearch'
import { EVENT_STATUS } from '../../lib/eventStatus'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

interface AdminEventFiltersFormProps {
  /** What the URL currently says. Give this component a new `key` when the URL changes to reset the form. */
  initial: AdminEventFilters
  onApply: (filters: AdminEventFilters) => void
}

export function AdminEventFiltersForm({ initial, onApply }: AdminEventFiltersFormProps) {
  const [draft, setDraft] = useState<AdminEventFilters>(initial)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply(draft)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Search"
          type="search"
          maxLength={100}
          placeholder="Event title"
          value={draft.q}
          onChange={(e) => setDraft((current) => ({ ...current, q: e.target.value }))}
        />
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as EventStatus | '' }))}
        >
          <option value="">All statuses</option>
          {(Object.keys(EVENT_STATUS) as EventStatus[]).map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS[status].label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Organizer ID"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.organizerId}
          onChange={(e) => setDraft((current) => ({ ...current, organizerId: e.target.value }))}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit">Apply filters</Button>
        <Button variant="ghost" onClick={() => onApply(EMPTY_ADMIN_EVENT_FILTERS)}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}