import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { VenueForm } from '../components/organizer/VenueForm'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { useOrganizerVenues } from '../hooks/useOrganizerVenues'
import { readPage } from '../lib/eventSearch'

const PAGE_SIZE = 10

export function OrganizerVenuesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [createdName, setCreatedName] = useState<string | null>(null)
  const { data, loading, error } = useOrganizerVenues(page, PAGE_SIZE, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function goToPage(next: number) {
    setSearchParams(next > 1 ? { page: String(next) } : {})
    headingRef.current?.focus()
  }

  return (
    <div>
      <Link to="/organizer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Organizer dashboard
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 focus:outline-none">
          Venues
        </h1>
        {!showForm && (
          <Button
            onClick={() => {
              setCreatedName(null)
              setShowForm(true)
            }}
          >
            Add venue
          </Button>
        )}
      </div>

      {createdName && (
        <div className="mt-4">
          <Alert variant="success">Venue “{createdName}” was created.</Alert>
        </div>
      )}

      {showForm && (
        <div className="mt-4">
          <VenueForm
            onCreated={(venue) => {
              setShowForm(false)
              setCreatedName(venue.name)
              setReloads((count) => count + 1)
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="mt-6">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}

        {!error && loading && !data && <Spinner label="Loading your venues…" />}

        {!error && data && data.content.length === 0 && (
          <p className="py-8 text-center text-slate-600">You have no venues yet. Add one to start creating events.</p>
        )}

        {!error && data && data.content.length > 0 && (
          <ul className={`space-y-4 ${loading ? 'opacity-60 transition-opacity' : ''}`} aria-busy={loading}>
            {data.content.map((venue) => (
              <li key={venue.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{venue.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {[venue.addressLine, venue.city, venue.region, venue.country].filter(Boolean).join(', ')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Capacity {venue.capacity} · Time zone {venue.timeZone}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}