import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Spinner } from '../ui/Spinner'
import { WorkspaceNav } from './WorkspaceNav'
import type { WorkspaceItem } from './WorkspaceNav'

const ITEMS: WorkspaceItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/events', label: 'Events', end: false },
  { to: '/admin/bookings', label: 'Bookings', end: false },
]

/** The frame around every admin page: the workspace bar, then the page in a centered column. */
export function AdminLayout() {
  return (
    <div>
      <WorkspaceNav label="Admin" items={ITEMS} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="sr-only">Administration</h1>
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}