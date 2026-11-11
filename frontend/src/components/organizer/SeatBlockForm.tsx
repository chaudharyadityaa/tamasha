import { useState } from 'react'
import type { FormEvent } from 'react'
import { userMessage } from '../../api/errors'
import { createSeatBlock } from '../../api/organizerOperations'
import type { SeatBlockResult } from '../../api/organizerOperationsTypes'
import { serverFieldErrors } from '../../lib/organizerValidation'
import type { FieldErrors } from '../../lib/organizerValidation'
import {
  EMPTY_SEAT_BLOCK_FORM,
  parseRows,
  SEAT_BLOCK_SERVER_FIELDS,
  toSeatBlockInput,
  validateSeatBlock,
} from '../../lib/seatBlockValidation'
import type { SeatBlockField, SeatBlockFormValues } from '../../lib/seatBlockValidation'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'

interface SeatBlockFormProps {
  venueId: number
  onCreated: (result: SeatBlockResult) => void
}

export function SeatBlockForm({ venueId, onCreated }: SeatBlockFormProps) {
  const [values, setValues] = useState<SeatBlockFormValues>(EMPTY_SEAT_BLOCK_FORM)
  const [errors, setErrors] = useState<FieldErrors<SeatBlockField>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function change(field: SeatBlockField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  // A live preview of what the form will create.
  const parsed = parseRows(values.rows)
  const perRow = /^\d+$/.test(values.seatsPerRow.trim()) ? Number(values.seatsPerRow.trim()) : 0
  const preview =
    'rows' in parsed && perRow > 0
      ? `This will create ${parsed.rows.length * perRow} seats (${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'} × ${perRow} seats).`
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const found = validateSeatBlock(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }
    setSubmitting(true)
    try {
      const result = await createSeatBlock(venueId, toSeatBlockInput(values))
      setValues(EMPTY_SEAT_BLOCK_FORM)
      onCreated(result)
    } catch (caught: unknown) {
      const server = serverFieldErrors(caught, SEAT_BLOCK_SERVER_FIELDS)
      if (Object.keys(server).length > 0) {
        setErrors(server)
      } else {
        setFormError(userMessage(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">Add seats</h3>
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Section"
          hint="For example VIP or Balcony."
          value={values.section}
          onChange={(e) => change('section', e.target.value)}
          error={errors.section}
        />
        <TextField
          label="Rows"
          hint="Ranges and lists: A-F, A, B, C or 1-10."
          value={values.rows}
          onChange={(e) => change('rows', e.target.value)}
          error={errors.rows}
        />
        <TextField
          label="Seats per row"
          type="number"
          min={1}
          max={200}
          step={1}
          inputMode="numeric"
          value={values.seatsPerRow}
          onChange={(e) => change('seatsPerRow', e.target.value)}
          error={errors.seatsPerRow}
        />
      </div>

      <p className="text-sm text-slate-600" aria-live="polite">
        {preview ?? '\u00a0'}
      </p>

      <Button type="submit" loading={submitting}>
        Create seats
      </Button>
    </form>
  )
}