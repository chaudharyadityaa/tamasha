import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { userMessage } from '../../api/errors'
import { createVenue } from '../../api/organizer'
import type { Venue } from '../../api/organizerTypes'
import { COMMON_TIME_ZONES } from '../../lib/organizerOptions'
import {
  EMPTY_VENUE_FORM,
  serverFieldErrors,
  toVenueInput,
  validateVenue,
  VENUE_FIELDS,
} from '../../lib/organizerValidation'
import type { FieldErrors, VenueField, VenueFormValues } from '../../lib/organizerValidation'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'

interface VenueFormProps {
  onCreated: (venue: Venue) => void
  onCancel: () => void
}

export function VenueForm({ onCreated, onCancel }: VenueFormProps) {
  const [values, setValues] = useState<VenueFormValues>(EMPTY_VENUE_FORM)
  const [errors, setErrors] = useState<FieldErrors<VenueField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const zonesId = useId()

  function change(field: VenueField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validateVenue(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    setSubmitting(true)
    try {
      onCreated(await createVenue(toVenueInput(values)))
    } catch (caught: unknown) {
      const fromServer = serverFieldErrors(caught, VENUE_FIELDS)
      if (Object.keys(fromServer).length > 0) {
        setErrors(fromServer)
      } else {
        setFormError(userMessage(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Add a venue</h2>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Venue name" value={values.name} onChange={(e) => change('name', e.target.value)} error={errors.name} />
        <TextField label="Address" autoComplete="street-address" value={values.addressLine} onChange={(e) => change('addressLine', e.target.value)} error={errors.addressLine} />
        <TextField label="City" value={values.city} onChange={(e) => change('city', e.target.value)} error={errors.city} />
        <TextField label="Region (optional)" value={values.region} onChange={(e) => change('region', e.target.value)} error={errors.region} />
        <TextField label="Country" value={values.country} onChange={(e) => change('country', e.target.value)} error={errors.country} />
        <div>
          <TextField
            label="Time zone"
            list={zonesId}
            hint="Event times are shown in this zone. Example: Asia/Kolkata"
            value={values.timeZone}
            onChange={(e) => change('timeZone', e.target.value)}
            error={errors.timeZone}
          />
          <datalist id={zonesId}>
            {COMMON_TIME_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </div>
        <TextField
          label="Capacity"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          hint="The most people the venue holds."
          value={values.capacity}
          onChange={(e) => change('capacity', e.target.value)}
          error={errors.capacity}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          Create venue
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}