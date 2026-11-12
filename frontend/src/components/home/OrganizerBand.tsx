import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

const buttonClass =
  'mt-6 inline-flex items-center justify-center rounded-full bg-midnight px-6 py-3 text-sm font-semibold text-white transition hover:bg-midnight/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2 focus-visible:ring-offset-marigold'

export function OrganizerBand() {
  const { status, user } = useAuth()

  return (
    <section aria-labelledby="host-heading" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <div className="relative isolate overflow-hidden rounded-md bg-marigold px-6 py-12 text-midnight sm:px-12">
        <div aria-hidden="true" className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-rose" />
        <div aria-hidden="true" className="absolute -bottom-24 right-28 -z-10 h-44 w-44 rounded-full bg-midnight" />

        <h2 id="host-heading" className="max-w-lg font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Hosting a night of your own?
        </h2>
        <p className="mt-3 max-w-lg text-midnight/80">
          Organizers get seat maps, live sales numbers and QR check-in at the door. Create an account, then ask an
          administrator to switch on organizer tools.
        </p>

        {status === 'anonymous' && (
          <Link to="/register" className={buttonClass}>
            Create an account
          </Link>
        )}
        {user?.role === 'ORGANIZER' && (
          <Link to="/organizer" className={buttonClass}>
            Open your dashboard
          </Link>
        )}
      </div>
    </section>
  )
}