import { useState } from 'react'
import type { FormEvent } from 'react'
import type { BookingStatus } from '../../api/bookingTypes'
import { EMPTY_ADMIN_BOOKING_FILTERS } from '../../lib/adminBookingSearch'
import type { AdminBookingFilters } from '../../lib/adminBookingSearch'
import { BOOKING_STATUS } from '../../lib/bookingStatus'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

interface AdminBookingFiltersFormProps {
  /** What the URL currently says. Give this component a new `key` when the URL changes to reset the form. */
  initial: AdminBookingFilters
  onApply: (filters: AdminBookingFilters) => void
}

export function AdminBookingFiltersForm({ initial, onApply }: AdminBookingFiltersFormProps) {
  const [draft, setDraft] = useState<AdminBookingFilters>(initial)

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
          placeholder="Reference or customer"
          value={draft.q}
          onChange={(e) => setDraft((current) => ({ ...current, q: e.target.value }))}
        />
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as BookingStatus | '' }))}
        >
          <option value="">All statuses</option>
          {(Object.keys(BOOKING_STATUS) as BookingStatus[]).map((status) => (
            <option key={status} value={status}>
              {BOOKING_STATUS[status].label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Event ID"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.eventId}
          onChange={(e) => setDraft((current) => ({ ...current, eventId: e.target.value }))}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit">Apply filters</Button>
        <Button variant="ghost" onClick={() => onApply(EMPTY_ADMIN_BOOKING_FILTERS)}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}