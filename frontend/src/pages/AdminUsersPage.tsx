import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminUserRow } from '../components/admin/AdminUserRow'
import { UserFiltersForm } from '../components/admin/UserFiltersForm'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../auth/useAuth'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { buildUserSearch, readUserFilters, USERS_PAGE_SIZE } from '../lib/adminUserSearch'
import type { UserFilters } from '../lib/adminUserSearch'
import { readPage } from '../lib/eventSearch'

export function AdminUsersPage() {
  const { user: me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchString = searchParams.toString()
  const filters = readUserFilters(searchParams)
  const page = readPage(searchParams)
  const [reloads, setReloads] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const { data, loading, error } = useAdminUsers(searchString, reloads)
  const headingRef = useRef<HTMLHeadingElement>(null)

  function applyFilters(next: UserFilters) {
    setNotice(null)
    setSearchParams(buildUserSearch(next, 1))
  }

  function goToPage(next: number) {
    setSearchParams(buildUserSearch(filters, next))
    headingRef.current?.focus() // keyboard and screen-reader users land at the top of the new page
  }

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-slate-900 focus:outline-none">
        Users
      </h2>

      <div className="mt-4">
        <UserFiltersForm key={searchString} initial={filters} onApply={applyFilters} />
      </div>

      <div className="mt-4" aria-live="polite">
        {notice && <Alert variant="success">{notice}</Alert>}
      </div>

      <div className="mt-4">
        {error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </Button>
          </div>
        )}
        {!error && loading && !data && <Spinner label="Loading users…" />}
        {!error && data && data.content.length === 0 && <p className="py-8 text-center text-slate-600">No users match your search.</p>}

        {!error && data && data.content.length > 0 && (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Showing {data.page * USERS_PAGE_SIZE + 1}–{data.page * USERS_PAGE_SIZE + data.content.length} of {data.totalElements}
            </p>
            <div
              className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${loading ? 'opacity-60 transition-opacity' : ''}`}
              aria-busy={loading}
            >
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Users</caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Name</th>
                    <th scope="col" className="px-4 py-2 font-medium">Email</th>
                    <th scope="col" className="px-4 py-2 font-medium">Role</th>
                    <th scope="col" className="px-4 py-2 font-medium">Account</th>
                    <th scope="col" className="px-4 py-2 font-medium">Joined</th>
                    <th scope="col" className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((user) => (
                    <AdminUserRow
                      key={user.id}
                      user={user}
                      isSelf={me?.id === user.id}
                      onChanged={(message) => {
                        setNotice(message)
                        setReloads((count) => count + 1) // show what the server really stored
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!error && data && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
      </div>
    </div>
  )
}