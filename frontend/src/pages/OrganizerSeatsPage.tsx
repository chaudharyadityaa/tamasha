import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { userMessage } from '../api/errors'
import { listSeatSections } from '../api/organizer'
import { deleteSeatSection, getVenue } from '../api/organizerOperations'
import type { SeatSection } from '../api/organizerInventoryTypes'
import { SeatBlockForm } from '../components/organizer/SeatBlockForm'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useApiResource } from '../hooks/useApiResource'

export function OrganizerSeatsPage() {
  const { id = '' } = useParams()
  if (!/^\d+$/.test(id)) {
    return <VenueNotFound />
  }
  // Keyed by id so moving to another venue never shows the previous venue's seats.
  return <SeatsView key={id} venueId={Number(id)} />
}

function VenueNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Venue not found</h1>
      <Link to="/organizer/venues" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
        Back to venues
      </Link>
    </div>
  )
}

function SeatsView({ venueId }: { venueId: number }) {
  const venue = useApiResource(getVenue, venueId, 0)
  const [reloads, setReloads] = useState(0)
  const sections = useApiResource(listSeatSections, venueId, reloads)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function remove(section: SeatSection) {
    setDeleting(section.section)
    setError(null)
    setNotice(null)
    try {
      await deleteSeatSection(venueId, section.section)
      setConfirming(null)
      setNotice(`Section “${section.section}” was deleted.`)
      setReloads((count) => count + 1)
    } catch (caught: unknown) {
      // For example: a ticket type still sells this section. The server explains.
      setError(userMessage(caught))
    } finally {
      setDeleting(null)
    }
  }

  if (venue.notFound) {
    return <VenueNotFound />
  }
  if (venue.loading) {
    return <Spinner label="Loading the venue…" />
  }
  if (venue.error || !venue.data) {
    return <Alert variant="error">{venue.error ?? 'The venue could not be loaded.'}</Alert>
  }

  const totalSeats = (sections.data ?? []).reduce((sum, section) => sum + section.seatCount, 0)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/organizer/venues" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Venues
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Seats at {venue.data.name}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Venue capacity {venue.data.capacity}
        {sections.data ? ` · ${totalSeats} seat${totalSeats === 1 ? '' : 's'} set up` : ''}
      </p>

      {notice && (
        <div className="mt-4">
          <Alert variant="success">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-6">
        <SeatBlockForm
          venueId={venueId}
          onCreated={(result) => {
            setError(null)
            setNotice(`Added ${result.seatsCreated} seats to section “${result.section}”.`)
            setReloads((count) => count + 1)
          }}
        />
      </div>

      <section aria-labelledby="sections-heading" className="mt-8">
        <h2 id="sections-heading" className="text-xl font-semibold text-slate-900">
          Sections
        </h2>

        <div className="mt-3">
          {sections.error && (
            <div className="space-y-3">
              <Alert variant="error">{sections.error}</Alert>
              <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
                Try again
              </Button>
            </div>
          )}
          {!sections.error && sections.loading && <Spinner label="Loading sections…" />}
          {!sections.error && sections.data && sections.data.length === 0 && (
            <p className="text-sm text-slate-600">No seats yet. Add a section above, then sell it with a reserved-seating ticket type.</p>
          )}
          {!sections.error && sections.data && sections.data.length > 0 && (
            <ul className="space-y-3">
              {sections.data.map((section) => (
                <li key={section.section} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <h3 className="font-semibold text-slate-900">{section.section}</h3>
                    <p className="text-sm text-slate-600">
                      {section.seatCount} seats · {section.rowCount} rows
                    </p>
                  </div>
                  {confirming === section.section ? (
                    <div role="group" aria-label={`Confirm deleting ${section.section}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-900">Delete every seat of “{section.section}”? This cannot be undone.</p>
                      <div className="mt-2 flex gap-2">
                        <Button variant="danger" loading={deleting === section.section} disabled={deleting !== null} onClick={() => remove(section)}>
                          Yes, delete section
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirming(null)}>
                          Keep
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={`Delete section ${section.section}`}
                      onClick={() => {
                        setError(null)
                        setNotice(null)
                        setConfirming(section.section)
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}