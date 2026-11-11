import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Role } from '../../api/types'
import { EMPTY_USER_FILTERS } from '../../lib/adminUserSearch'
import type { UserFilters } from '../../lib/adminUserSearch'
import { ROLE_LABEL, ROLES } from '../../lib/roleLabels'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

interface UserFiltersFormProps {
  /** What the URL currently says. Give this component a new `key` when the URL changes to reset the form. */
  initial: UserFilters
  onApply: (filters: UserFilters) => void
}

export function UserFiltersForm({ initial, onApply }: UserFiltersFormProps) {
  const [draft, setDraft] = useState<UserFilters>(initial)

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
          placeholder="Name or email"
          value={draft.q}
          onChange={(e) => setDraft((current) => ({ ...current, q: e.target.value }))}
        />
        <SelectField
          label="Role"
          value={draft.role}
          onChange={(e) => setDraft((current) => ({ ...current, role: e.target.value as Role | '' }))}
        >
          <option value="">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={draft.enabled}
          onChange={(e) => setDraft((current) => ({ ...current, enabled: e.target.value as UserFilters['enabled'] }))}
        >
          <option value="">All accounts</option>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </SelectField>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit">Apply filters</Button>
        <Button variant="ghost" onClick={() => onApply(EMPTY_USER_FILTERS)}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}