import { NavLink, Outlet } from 'react-router-dom'

const ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users', end: false },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-block rounded-full px-4 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
    isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100'
  }`

/** The frame around every admin page: a title and the section links. */
export function AdminLayout() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
      <nav aria-label="Admin sections" className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={linkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}