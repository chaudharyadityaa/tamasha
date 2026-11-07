import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, Clock, X } from 'lucide-react'
import type { SeatMapSection, SeatView } from '../../api/seatTypes'
import { formatMoney } from '../../lib/format'
import { neighbourSeat } from '../../lib/seatNavigation'

type SeatState = 'available' | 'selected' | 'held' | 'booked' | 'locked'

interface SeatSectionGridProps {
  section: SeatMapSection
  currency: string
  selectedIds: ReadonlySet<number>
  /** How many more seats of this section the person may still add. */
  sectionRoom: number
  /** How many more seats overall the person may still add. */
  overallRoom: number
  onToggle: (seat: SeatView) => void
}

function stateOf(seat: SeatView, selected: boolean, section: SeatMapSection, room: number): SeatState {
  if (selected) {
    return 'selected'
  }
  if (seat.status === 'BOOKED') {
    return 'booked'
  }
  if (seat.status === 'HELD') {
    return 'held'
  }
  return section.onSale && room > 0 ? 'available' : 'locked'
}

function spokenState(state: SeatState, section: SeatMapSection): string {
  switch (state) {
    case 'available':
      return 'available'
    case 'selected':
      return 'selected'
    case 'held':
      return 'held by another customer'
    case 'booked':
      return 'already booked'
    case 'locked':
      return section.onSale ? 'selection limit reached' : 'sales not open'
  }
}

const styles: Record<SeatState, string> = {
  available: 'border-slate-300 bg-white text-slate-800 hover:border-indigo-500 hover:bg-indigo-50',
  selected: 'border-indigo-700 bg-indigo-600 text-white',
  held: 'cursor-not-allowed border-amber-300 bg-amber-100 text-amber-800',
  booked: 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500',
  locked: 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400',
}

/** Groups seats into rows, keeping the order the server sent (already sorted naturally). */
function groupByRow(seats: SeatView[]): [string, SeatView[]][] {
  const rows = new Map<string, SeatView[]>()
  for (const seat of seats) {
    const row = rows.get(seat.row)
    if (row) {
      row.push(seat)
    } else {
      rows.set(seat.row, [seat])
    }
  }
  return [...rows.entries()]
}

export function SeatSectionGrid({ section, currency, selectedIds, sectionRoom, overallRoom, onToggle }: SeatSectionGridProps) {
  const room = Math.min(sectionRoom, overallRoom)
  const rows = groupByRow(section.seats)
  const [focusedId, setFocusedId] = useState<number | null>(null)
  // Roving tab stop: the whole section is ONE Tab stop, and arrow keys move around inside it.
  const firstSeatId = section.seats[0]?.id ?? null
  const tabStopId = section.seats.some((seat) => seat.id === focusedId) ? focusedId : firstSeatId

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = neighbourSeat(event.currentTarget, event.key)
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-flex min-w-full flex-col gap-1.5">
        {rows.map(([row, seats]) => (
          <div key={row} role="group" aria-label={`Row ${row}`} data-seat-row className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-xs font-medium text-slate-500" aria-hidden="true">
              {row}
            </span>
            {seats.map((seat) => {
              const selected = selectedIds.has(seat.id)
              const state = stateOf(seat, selected, section, room)
              const label = `${section.section}, row ${seat.row}, seat ${seat.number}, ${formatMoney(section.price, currency)}, ${spokenState(state, section)}`
              return (
                <button
                  key={seat.id}
                  type="button"
                  data-seat
                  aria-label={label}
                  aria-pressed={state === 'available' || state === 'selected' || state === 'locked' ? selected : undefined}
                  aria-disabled={state === 'held' || state === 'booked' || state === 'locked' ? true : undefined}
                  tabIndex={seat.id === tabStopId ? 0 : -1}
                  onFocus={() => setFocusedId(seat.id)}
                  onKeyDown={handleKeyDown}
                  onClick={() => {
                    if (state === 'available' || state === 'selected') {
                      onToggle(seat)
                    }
                  }}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${styles[state]}`}
                >
                  {state === 'held' ? (
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  ) : state === 'booked' ? (
                    <X className="h-4 w-4" aria-hidden="true" />
                  ) : selected ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    seat.number
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}