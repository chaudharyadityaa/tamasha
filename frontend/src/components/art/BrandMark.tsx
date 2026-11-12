/** The logo: a ticket stub with side notches and a perforation line. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M7 10h18a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4v-3a1 1 0 0 1 1-1z"
        fill="#ffb627"
      />
      <path d="M20 11v10" stroke="#170f2e" strokeWidth="1.6" strokeDasharray="2 2" />
      <circle cx="13" cy="16" r="2.4" fill="#ff4d8d" />
    </svg>
  )
}