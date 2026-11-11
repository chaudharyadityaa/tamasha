/** A moment in the visitor's own time zone, for places that do not know the venue's zone. */
export function formatShortLocal(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

/** An amount with two decimals and no currency symbol, for places where the currency is not known. */
export function formatPlainAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}