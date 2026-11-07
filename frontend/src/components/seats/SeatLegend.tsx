import { Check, Clock, X } from 'lucide-react'

const swatch = 'flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium'

/** Explains the seat styles. Each state differs by shape or icon as well as color. */
export function SeatLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700" aria-label="Seat legend">
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-slate-300 bg-white text-slate-800`} aria-hidden="true">
          1
        </span>
        Available
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-indigo-700 bg-indigo-600 text-white`} aria-hidden="true">
          <Check className="h-4 w-4" />
        </span>
        Selected
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-amber-300 bg-amber-100 text-amber-800`} aria-hidden="true">
          <Clock className="h-4 w-4" />
        </span>
        Held by someone else
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-slate-300 bg-slate-200 text-slate-500`} aria-hidden="true">
          <X className="h-4 w-4" />
        </span>
        Booked
      </li>
    </ul>
  )
}