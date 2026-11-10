import { useState } from 'react'
import type { FormEvent } from 'react'
import { userMessage } from '../../api/errors'
import { createTicketType, listSeatSections } from '../../api/organizer'
import type { OrganizerTicketType } from '../../api/organizerInventoryTypes'
import type { OrganizerEvent } from '../../api/organizerTypes'
import { useApiResource } from '../../hooks/useApiResource'
import { serverFieldErrors } from '../../lib/organizerValidation'
import type { FieldErrors } from '../../lib/organizerValidation'
import {
  EMPTY_TICKET_TYPE_FORM,
  TICKET_TYPE_SERVER_FIELDS,
  toTicketTypeInput,
  validateTicketType,
} from '../../lib/ticketTypeValidation'
import type { TicketTypeField, TicketTypeFormValues } from '../../lib/ticketTypeValidation'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { SelectField } from '../ui/SelectField'
import { TextField } from '../ui/TextField'

interface TicketTypeFormProps {
  event: OrganizerEvent
  onCreated: (created: OrganizerTicketType) => void
  onCancel: () => void
}

export function TicketTypeForm({ event, onCreated, onCancel }: TicketTypeFormProps) {
  const reserved = event.seatingMode === 'RESERVED_SEATING'
  const timeZone = event.venue.timeZone
  const [values, setValues] = useState<TicketTypeFormValues>(EMPTY_TICKET_TYPE_FORM)
  const [errors, setErrors] = useState<FieldErrors<TicketTypeField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Reserved-seating types sell one of the seat sections that exist in the venue.
  const sections = useApiResource(listSeatSections, reserved ? event.venue.id : null, 0)

  function change(field: TicketTypeField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    setFormError(null)
    const found = validateTicketType(values, event.seatingMode, timeZone)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    setSubmitting(true)
    try {
      onCreated(await createTicketType(event.id, toTicketTypeInput(values, event.seatingMode, timeZone)))
    } catch (caught: unknown) {
      const server = serverFieldErrors(caught, TICKET_TYPE_SERVER_FIELDS)
      if (Object.keys(server).length > 0) {
        setErrors({
          name: server.name,
          price: server.price,
          quantityTotal: server.quantityTotal,
          seatSection: server.seatSection,
          maxPerBooking: server.maxPerBooking,
          salesStartLocal: server.salesStart,
          salesEndLocal: server.salesEnd,
        })
      } else {
        setFormError(userMessage(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const zoneHint = `Venue time zone: ${timeZone}`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">Add a ticket type</h3>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={values.name} onChange={(e) => change('name', e.target.value)} error={errors.name} />
        <TextField
          label={`Price (${event.currency})`}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={values.price}
          onChange={(e) => change('price', e.target.value)}
          error={errors.price}
        />

        {reserved ? (
          <div>
            <SelectField
              label="Seat section"
              hint="The seats of this section are sold at this price."
              value={values.seatSection}
              onChange={(e) => change('seatSection', e.target.value)}
              error={errors.seatSection}
            >
              <option value="">Choose a section</option>
              {(sections.data ?? []).map((section) => (
                <option key={section.section} value={section.section}>
                  {section.section} ({section.seatCount} seats)
                </option>
              ))}
            </SelectField>
            {sections.error && <p className="mt-1 text-sm text-red-600">{sections.error}</p>}
            {sections.data && sections.data.length === 0 && (
              <p className="mt-1 text-sm text-amber-700">This venue has no seats yet. Seat setup arrives in an upcoming update.</p>
            )}
          </div>
        ) : (
          <TextField
            label="Quantity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            hint="How many tickets of this type can be sold."
            value={values.quantityTotal}
            onChange={(e) => change('quantityTotal', e.target.value)}
            error={errors.quantityTotal}
          />
        )}

        <TextField
          label="Max per booking"
          type="number"
          min={1}
          max={20}
          step={1}
          inputMode="numeric"
          hint="Optional. Leave empty to use the default."
          value={values.maxPerBooking}
          onChange={(e) => change('maxPerBooking', e.target.value)}
          error={errors.maxPerBooking}
        />
        <TextField
          label="Sales open"
          type="datetime-local"
          hint={`Optional. ${zoneHint}`}
          value={values.salesStartLocal}
          onChange={(e) => change('salesStartLocal', e.target.value)}
          error={errors.salesStartLocal}
        />
        <TextField
          label="Sales close"
          type="datetime-local"
          hint={`Optional. ${zoneHint}`}
          value={values.salesEndLocal}
          onChange={(e) => change('salesEndLocal', e.target.value)}
          error={errors.salesEndLocal}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          Save ticket type
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}