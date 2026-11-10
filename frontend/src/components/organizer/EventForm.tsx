import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { userMessage } from '../../api/errors'
import type { Venue } from '../../api/organizerTypes'
import type { SeatingMode } from '../../api/types'
import { SEATING_LABEL } from '../../lib/eventStatus'
import { EVENT_CATEGORIES } from '../../lib/organizerOptions'
import { serverFieldErrors, validateEvent } from '../../lib/organizerValidation'
import type { EventField, EventFormValues, FieldErrors } from '../../lib/organizerValidation'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/SelectField'
import { TextAreaField } from '../ui/TextAreaField'
import { TextField } from '../ui/TextField'

// The names the server uses for the fields (the form calls the two times startsLocal / endsLocal).
const SERVER_FIELDS = [
  'venueId',
  'title',
  'description',
  'category',
  'imageUrl',
  'startsAt',
  'endsAt',
  'currency',
  'cancellationCutoffHours',
] as const

interface EventFormProps {
  mode: 'create' | 'edit'
  /** The venues to choose from (create mode). */
  venues: Venue[]
  /** The event's venue (edit mode): it cannot be changed. */
  fixedVenue?: Venue
  initial: EventFormValues
  submitLabel: string
  /** Throws an ApiError when the server refuses. */
  onSubmit: (values: EventFormValues, timeZone: string) => Promise<void>
  onCancel: () => void
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  )
}

export function EventForm({ mode, venues, fixedVenue, initial, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(initial)
  const [errors, setErrors] = useState<FieldErrors<EventField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const categoriesId = useId()

  const venue = mode === 'create' ? venues.find((candidate) => String(candidate.id) === values.venueId) : fixedVenue
  const timeZone = venue?.timeZone ?? null
  const zoneHint = timeZone ? `Venue time zone: ${timeZone}` : 'Choose a venue first: times are in the venue\'s time zone.'

  function change<K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validateEvent(values, mode, timeZone)
    setErrors(found)
    if (Object.keys(found).length > 0 || !timeZone) {
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(values, timeZone)
    } catch (caught: unknown) {
      const server = serverFieldErrors(caught, SERVER_FIELDS)
      if (Object.keys(server).length > 0) {
        setErrors({
          venueId: server.venueId,
          title: server.title,
          description: server.description,
          category: server.category,
          imageUrl: server.imageUrl,
          startsLocal: server.startsAt,
          endsLocal: server.endsAt,
          currency: server.currency,
          cancellationCutoffHours: server.cancellationCutoffHours,
        })
      } else {
        setFormError(userMessage(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === 'create' ? (
          <>
            <SelectField label="Venue" value={values.venueId} onChange={(e) => change('venueId', e.target.value)} error={errors.venueId}>
              <option value="">Choose a venue</option>
              {venues.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.city})
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Seating"
              hint="This cannot be changed after the event is created."
              value={values.seatingMode}
              onChange={(e) => change('seatingMode', e.target.value as SeatingMode)}
            >
              <option value="GENERAL_ADMISSION">{SEATING_LABEL.GENERAL_ADMISSION}</option>
              <option value="RESERVED_SEATING">{SEATING_LABEL.RESERVED_SEATING}</option>
            </SelectField>
          </>
        ) : (
          <>
            <ReadOnly label="Venue" value={fixedVenue ? `${fixedVenue.name}, ${fixedVenue.city}` : ''} />
            <ReadOnly label="Seating" value={SEATING_LABEL[values.seatingMode]} />
          </>
        )}
      </div>

      <TextField label="Title" value={values.title} onChange={(e) => change('title', e.target.value)} error={errors.title} />

      <div>
        <TextField label="Category" list={categoriesId} value={values.category} onChange={(e) => change('category', e.target.value)} error={errors.category} />
        <datalist id={categoriesId}>
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <TextAreaField label="Description" rows={5} value={values.description} onChange={(e) => change('description', e.target.value)} error={errors.description} />
      <TextField label="Image URL" type="url" hint="Optional. A link to a picture, starting with https://" value={values.imageUrl} onChange={(e) => change('imageUrl', e.target.value)} error={errors.imageUrl} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Starts" type="datetime-local" hint={zoneHint} value={values.startsLocal} onChange={(e) => change('startsLocal', e.target.value)} error={errors.startsLocal} />
        <TextField label="Ends" type="datetime-local" hint={zoneHint} value={values.endsLocal} onChange={(e) => change('endsLocal', e.target.value)} error={errors.endsLocal} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === 'create' ? (
          <TextField label="Currency" maxLength={3} hint="3-letter code, for example INR" value={values.currency} onChange={(e) => change('currency', e.target.value)} error={errors.currency} />
        ) : (
          <ReadOnly label="Currency" value={values.currency} />
        )}
        <TextField
          label="Cancellation cutoff (hours)"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          hint="Customers can cancel paid bookings until this many hours before the start."
          value={values.cancellationCutoffHours}
          onChange={(e) => change('cancellationCutoffHours', e.target.value)}
          error={errors.cancellationCutoffHours}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}