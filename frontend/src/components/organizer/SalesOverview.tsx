import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { BookingStatus } from '../../api/bookingTypes'
import { getEventStats } from '../../api/organizerOperations'
import { useApiResource } from '../../hooks/useApiResource'
import { BOOKING_STATUS } from '../../lib/bookingStatus'
import { formatMoney } from '../../lib/format'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'

const STATUS_ORDER = ['CONFIRMED', 'PENDING_PAYMENT', 'CANCELLED', 'EXPIRED']

function statusLabel(key: string): string {
  return BOOKING_STATUS[key as BookingStatus]?.label ?? key
}

function orderOf(key: string): number {
  const index = STATUS_ORDER.indexOf(key)
  return index === -1 ? STATUS_ORDER.length : index
}

/** The server's own numbers: revenue, occupancy, bookings by status and a table per ticket type. */
export function SalesOverview({ eventId }: { eventId: number }) {
  const [reloads, setReloads] = useState(0)
  const { data: stats, error, loading } = useApiResource(getEventStats, eventId, reloads)

  return (
    <section aria-labelledby="sales-heading" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sales-heading" className="text-xl font-semibold text-slate-900">
          Sales
        </h2>
        <Button variant="ghost" onClick={() => setReloads((count) => count + 1)}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {loading && !stats && <Spinner label="Loading sales numbers…" />}

      {stats && (
        <div className="mt-4 space-y-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <dt className="text-sm text-slate-500">Revenue (confirmed bookings)</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(stats.confirmedRevenue, stats.currency)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
              <dt className="text-sm text-slate-500">Occupancy</dt>
              <dd className="mt-1">
                <span className="text-2xl font-bold text-slate-900">{stats.overall.occupancyPercent.toFixed(1)}%</span>
                <div
                  role="progressbar"
                  aria-label="Occupancy"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(100, Math.max(0, stats.overall.occupancyPercent)))}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${Math.min(100, Math.max(0, stats.overall.occupancyPercent))}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {stats.overall.confirmed} sold · {stats.overall.held} held · {stats.overall.available} available · capacity{' '}
                  {stats.overall.capacity}
                </p>
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-base font-semibold text-slate-900">Bookings by status</h3>
            {Object.keys(stats.bookingsByStatus).length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">No bookings yet.</p>
            ) : (
              <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {Object.entries(stats.bookingsByStatus)
                  .sort(([a], [b]) => orderOf(a) - orderOf(b))
                  .map(([key, count]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="text-slate-600">{statusLabel(key)}</dt>
                      <dd className="font-semibold text-slate-900">{count}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>

          {stats.ticketTypes.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Sales by ticket type</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Ticket type</th>
                    <th scope="col" className="px-4 py-2 font-medium">Section</th>
                    <th scope="col" className="px-4 py-2 font-medium">Price</th>
                    <th scope="col" className="px-4 py-2 font-medium">Capacity</th>
                    <th scope="col" className="px-4 py-2 font-medium">Sold</th>
                    <th scope="col" className="px-4 py-2 font-medium">Held</th>
                    <th scope="col" className="px-4 py-2 font-medium">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.ticketTypes.map((type) => (
                    <tr key={type.ticketTypeId}>
                      <th scope="row" className="px-4 py-2 font-medium text-slate-900">{type.name}</th>
                      <td className="px-4 py-2">{type.seatSection ?? '–'}</td>
                      <td className="px-4 py-2">{type.price === 0 ? 'Free' : formatMoney(type.price, stats.currency)}</td>
                      <td className="px-4 py-2">{type.capacity}</td>
                      <td className="px-4 py-2">{type.confirmed}</td>
                      <td className="px-4 py-2">{type.held}</td>
                      <td className="px-4 py-2">{type.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}