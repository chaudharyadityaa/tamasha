import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Spinner } from '../ui/Spinner'
import { WorkspaceNav } from './WorkspaceNav'
import type { WorkspaceItem } from './WorkspaceNav'

const ITEMS: WorkspaceItem[] = [
  { to: '/organizer', label: 'Dashboard', end: true },
  { to: '/organizer/venues', label: 'Venues', end: false },
  { to: '/organizer/events/new', label: 'New event', end: true },
]

/** The frame around every organizer page: the workspace bar, then the page in a centered column. */
export function OrganizerLayout() {
  return (
    <div>
      <WorkspaceNav label="Organizer" items={ITEMS} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}