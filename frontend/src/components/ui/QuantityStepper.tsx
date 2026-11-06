import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  /** Describes what is being counted, for screen readers (for example "Standing quantity"). */
  label: string
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
}

const buttonClass =
  'flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40'

export function QuantityStepper({ label, value, min = 0, max, onChange }: QuantityStepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300">
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={buttonClass}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-9 text-center text-sm font-semibold text-slate-900" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={buttonClass}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}