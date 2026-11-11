interface BreakdownListProps {
  counts: Record<string, number>
  /** Keys listed here come first, in this order. Any other key follows, so nothing is ever hidden. */
  order: readonly string[]
  label: (key: string) => string
}

export function BreakdownList({ counts, order, label }: BreakdownListProps) {
  const rank = (key: string) => {
    const index = order.indexOf(key)
    return index === -1 ? order.length : index
  }
  const entries = Object.entries(counts).sort(([a], [b]) => rank(a) - rank(b))

  if (entries.length === 0) {
    return <p className="mt-2 text-sm text-slate-600">None yet.</p>
  }
  return (
    <dl className="mt-2 space-y-1 text-sm">
      {entries.map(([key, count]) => (
        <div key={key} className="flex justify-between gap-4">
          <dt className="text-slate-600">{label(key)}</dt>
          <dd className="font-semibold text-slate-900">{count}</dd>
        </div>
      ))}
    </dl>
  )
}