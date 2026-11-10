import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createEvent, getOrganizerEvent, updateEvent } from '../api/organizer'
import { EventForm } from '../components/organizer/EventForm'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { useApiResource } from '../hooks/useApiResource'
import { useOrganizerVenues } from '../hooks/useOrganizerVenues'
import {
  EMPTY_EVENT_FORM,
  eventToFormValues,
  toCreateEventInput,
  toUpdateEventInput,
} from '../lib/organizerValidation'

export function OrganizerEventFormPage({ mode }: { mode: 'create' | 'edit' }) {
  return mode === 'create' ? <CreateEventView /> : <EditEventView />
}

function CreateEventView() {
  const navigate = useNavigate()
  // The form needs every venue to choose from. 100 is far more than one organizer will have.
  const venues = useOrganizerVenues(1, 100, 0)

  if (!venues.data) {
    return venues.error ? <Alert variant="error">{venues.error}</Alert> : <Spinner label="Loading your venues…" />
  }
  if (venues.data.content.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">New event</h1>
        <p className="mt-2 text-slate-700">You need a venue first.</p>
        <Link to="/organizer/venues" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Add a venue
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/organizer" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Organizer dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">New event</h1>
      <p className="mt-1 text-sm text-slate-600">The event starts as a draft. You can add ticket types and publish it afterwards.</p>
      <div className="mt-6">
        <EventForm
          mode="create"
          venues={venues.data.content}
          initial={EMPTY_EVENT_FORM}
          submitLabel="Create event"
          onSubmit={async (values, timeZone) => {
            const created = await createEvent(toCreateEventInput(values, timeZone))
            void navigate(`/organizer/events/${created.id}`)
          }}
          onCancel={() => void navigate('/organizer')}
        />
      </div>
    </div>
  )
}

function EditEventView() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const validId = /^\d+$/.test(id)
  const { data: event, loading, error, notFound } = useApiResource(getOrganizerEvent, validId ? Number(id) : null, 0)

  if (!validId || notFound) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Event not found</h1>
        <Link to="/organizer" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">
          Back to the dashboard
        </Link>
      </div>
    )
  }
  if (loading) {
    return <Spinner label="Loading the event…" />
  }
  if (error || !event) {
    return <Alert variant="error">{error ?? 'The event could not be loaded.'}</Alert>
  }
  if (event.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8">
        <Alert variant="info">Cancelled events cannot be edited.</Alert>
        <Link to={`/organizer/events/${event.id}`} className="text-sm font-medium text-indigo-700 hover:underline">
          Back to the event
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/organizer/events/${event.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to the event
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Edit event</h1>
      <div className="mt-6">
        <EventForm
          mode="edit"
          venues={[]}
          fixedVenue={event.venue}
          initial={eventToFormValues(event)}
          submitLabel="Save changes"
          onSubmit={async (values, timeZone) => {
            await updateEvent(event.id, toUpdateEventInput(values, timeZone))
            void navigate(`/organizer/events/${event.id}`)
          }}
          onCancel={() => void navigate(`/organizer/events/${event.id}`)}
        />
      </div>
    </div>
  )
}