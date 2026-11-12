import { Check, Clock, X } from 'lucide-react'

const swatch = 'flex h-7 w-7 items-center justify-center rounded-t-lg rounded-b-sm border text-xs font-medium'

/** Explains the seat styles on the dark seat panel. Each state differs by shape or icon as well as color. */
export function SeatLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80" aria-label="Seat legend">
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-white/30 bg-white/10 text-white`} aria-hidden="true">
          1
        </span>
        Available
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-marigold bg-marigold text-midnight`} aria-hidden="true">
          <Check className="h-4 w-4" />
        </span>
        Selected
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-rose/40 bg-rose/15 text-rose`} aria-hidden="true">
          <Clock className="h-4 w-4" />
        </span>
        Held by someone else
      </li>
      <li className="flex items-center gap-2">
        <span className={`${swatch} border-white/10 bg-white/5 text-white/30`} aria-hidden="true">
          <X className="h-4 w-4" />
        </span>
        Booked
      </li>
    </ul>
  )
}