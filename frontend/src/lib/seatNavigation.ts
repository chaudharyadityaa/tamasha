/**
 * Finds the seat to move to for an arrow key, using the page structure: each row is an element with
 * data-seat-row that contains buttons with data-seat, and the rows of a section are siblings.
 * Returns null when there is nowhere to go (so the key does nothing).
 */
export function neighbourSeat(current: HTMLElement, key: string): HTMLElement | null {
  const row = current.closest<HTMLElement>('[data-seat-row]')
  if (!row) {
    return null
  }
  const seatsInRow = Array.from(row.querySelectorAll<HTMLElement>('[data-seat]'))
  const index = seatsInRow.indexOf(current)

  switch (key) {
    case 'ArrowLeft':
      return seatsInRow[index - 1] ?? null
    case 'ArrowRight':
      return seatsInRow[index + 1] ?? null
    case 'Home':
      return seatsInRow[0] ?? null
    case 'End':
      return seatsInRow[seatsInRow.length - 1] ?? null
    case 'ArrowUp':
    case 'ArrowDown': {
      const sibling = key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling
      if (!(sibling instanceof HTMLElement) || !sibling.hasAttribute('data-seat-row')) {
        return null
      }
      const others = Array.from(sibling.querySelectorAll<HTMLElement>('[data-seat]'))
      // Rows can have different lengths, so stay in the same column where possible.
      return others[Math.min(index, others.length - 1)] ?? null
    }
    default:
      return null
  }
}