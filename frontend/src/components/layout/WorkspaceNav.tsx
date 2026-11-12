import { NavLink } from 'react-router-dom'

export interface WorkspaceItem {
  to: string
  label: string
  end: boolean
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold ${
    isActive ? 'bg-white text-midnight' : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`

/** A slim dark bar under the main navigation for the working areas (organizer and admin). */
export function WorkspaceNav({ label, items }: { label: string; items: WorkspaceItem[] }) {
  return (
    <div className="border-t border-white/10 bg-midnight text-white print:hidden">
      <nav aria-label={label} className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
        <span className="mr-2 shrink-0 text-sm font-semibold text-marigold">{label}</span>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}