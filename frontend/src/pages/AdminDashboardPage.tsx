import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getAdminDashboard } from '../api/admin'
import type { BookingStatus } from '../api/bookingTypes'
import type { EventStatus } from '../api/organizerTypes'
import type { Role } from '../api/types'
import { BreakdownList } from '../components/admin/BreakdownList'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useApiResource } from '../hooks/useApiResource'
import { BOOKING_STATUS } from '../lib/bookingStatus'
import { EVENT_STATUS } from '../lib/eventStatus'
import { formatMoney } from '../lib/format'
import { ROLE_LABEL } from '../lib/roleLabels'

// The dashboard has no id, so give the shared loader a fixed argument.
const fetchDashboard = (_unused: number, signal: AbortSignal) => getAdminDashboard(signal)

const roleLabel = (key: string) => ROLE_LABEL[key as Role] ?? key
const eventLabel = (key: string) => EVENT_STATUS[key as EventStatus]?.label ?? key
const bookingLabel = (key: string) => BOOKING_STATUS[key as BookingStatus]?.label ?? key

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 id={id} className="text-sm font-medium text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function AdminDashboardPage() {
  const [reloads, setReloads] = useState(0)
  const { data, error, loading } = useApiResource(fetchDashboard, 0, reloads)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-slate-500">
              Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="ghost" onClick={() => setReloads((count) => count + 1)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 space-y-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
            Try again
          </Button>
        </div>
      )}
      {loading && <Spinner label="Loading the dashboard…" />}

      {data && (
        <div className="mt-4 space-y-4">
          <Alert variant="info">
            {data.demoPaymentsEnabled
              ? 'Demo payments are ON: customers can pay, and no real money moves.'
              : 'Demo payments are OFF: customers cannot pay until a payment method is enabled.'}
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card id="card-users" title="Users">
              <p className="mt-1 text-3xl font-bold text-slate-900">{data.users.total}</p>
              <p className="text-sm text-slate-600">{data.users.disabled} disabled</p>
              <BreakdownList counts={data.users.byRole} order={['CUSTOMER', 'ORGANIZER', 'ADMIN']} label={roleLabel} />
            </Card>

            <Card id="card-events" title="Events">
              <p className="mt-1 text-3xl font-bold text-slate-900">{data.events.total}</p>
              <p className="text-sm text-slate-600">{data.events.upcomingPublished} upcoming and published</p>
              <BreakdownList counts={data.events.byStatus} order={['PUBLISHED', 'DRAFT', 'CANCELLED']} label={eventLabel} />
            </Card>

            <Card id="card-bookings" title="Bookings">
              <p className="mt-1 text-3xl font-bold text-slate-900">{data.bookings.total}</p>
              <BreakdownList
                counts={data.bookings.byStatus}
                order={['CONFIRMED', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED']}
                label={bookingLabel}
              />
            </Card>

            <Card id="card-tickets" title="Tickets">
              <p className="mt-1 text-3xl font-bold text-slate-900">{data.tickets.total}</p>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Valid</dt>
                  <dd className="font-semibold text-slate-900">{data.tickets.valid}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Checked in</dt>
                  <dd className="font-semibold text-slate-900">{data.tickets.checkedIn}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Cancelled</dt>
                  <dd className="font-semibold text-slate-900">{data.tickets.voided}</dd>
                </div>
              </dl>
            </Card>

            <Card id="card-revenue" title="Revenue (confirmed bookings)">
              {data.confirmedRevenue.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No confirmed bookings yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {data.confirmedRevenue.map((line) => (
                    <li key={line.currency} className="text-2xl font-bold text-slate-900">
                      {formatMoney(line.amount, line.currency)}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}