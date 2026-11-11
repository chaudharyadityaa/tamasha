import { useId, useState } from 'react'
import { setUserEnabled, setUserRole } from '../../api/admin'
import type { AdminUser } from '../../api/adminTypes'
import { userMessage } from '../../api/errors'
import type { Role } from '../../api/types'
import { ROLE_LABEL, ROLE_TONE, ROLES } from '../../lib/roleLabels'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

type Pending = { kind: 'disable' } | { kind: 'role'; role: Role } | null

interface AdminUserRowProps {
  user: AdminUser
  /** True for the signed-in admin's own row: the server forbids changing your own account. */
  isSelf: boolean
  /** Called after the server accepted a change, so the page can say what happened and reload the list. */
  onChanged: (message: string) => void
}

const joined = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' })

export function AdminUserRow({ user, isSelf, onChanged }: AdminUserRowProps) {
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roleSelectId = useId()

  async function apply(action: () => Promise<AdminUser>, message: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setPending(null)
      onChanged(message)
    } catch (caught: unknown) {
      // The server explains refusals, for example changing your own account or the last administrator.
      setError(userMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  function toggleEnabled() {
    if (user.enabled) {
      setError(null)
      setPending({ kind: 'disable' }) // disabling needs a second, explicit click
    } else {
      void apply(() => setUserEnabled(user.id, true), `${user.fullName} was enabled.`)
    }
  }

  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-3 font-medium text-slate-900">
        {user.fullName}
      </th>
      <td className="px-4 py-3 text-slate-700">{user.email}</td>
      <td className="px-4 py-3">
        <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge tone={user.enabled ? 'success' : 'danger'}>{user.enabled ? 'Active' : 'Disabled'}</Badge>
      </td>
      <td className="px-4 py-3 text-slate-600">{joined(user.createdAt)}</td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-xs text-slate-500">This is your account</span>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                aria-label={`${user.enabled ? 'Disable' : 'Enable'} ${user.fullName}`}
                disabled={busy}
                onClick={toggleEnabled}
              >
                {user.enabled ? 'Disable' : 'Enable'}
              </Button>
              <label htmlFor={roleSelectId} className="sr-only">
                Role for {user.fullName}
              </label>
              <select
                id={roleSelectId}
                value={user.role}
                disabled={busy}
                onChange={(e) => {
                  const role = e.target.value as Role
                  setError(null)
                  setPending(role === user.role ? null : { kind: 'role', role })
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </div>

            {pending?.kind === 'disable' && (
              <div role="group" aria-label={`Confirm disabling ${user.fullName}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-900">
                  Disable {user.fullName}&rsquo;s account? They will not be able to log in until you enable it again.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="danger" loading={busy} disabled={busy} onClick={() => apply(() => setUserEnabled(user.id, false), `${user.fullName} was disabled.`)}>
                    Yes, disable
                  </Button>
                  <Button variant="ghost" onClick={() => setPending(null)}>
                    Keep active
                  </Button>
                </div>
              </div>
            )}

            {pending?.kind === 'role' && (
              <div role="group" aria-label={`Confirm changing the role of ${user.fullName}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">
                  Change {user.fullName}&rsquo;s role from {ROLE_LABEL[user.role]} to {ROLE_LABEL[pending.role]}?
                </p>
                {pending.role === 'ADMIN' && (
                  <p className="mt-1 text-sm font-medium text-amber-900">
                    Administrators can manage every user, event and booking on the platform.
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button
                    loading={busy}
                    disabled={busy}
                    onClick={() => apply(() => setUserRole(user.id, pending.role), `${user.fullName} is now ${ROLE_LABEL[pending.role]}.`)}
                  >
                    Yes, change role
                  </Button>
                  <Button variant="ghost" onClick={() => setPending(null)}>
                    Keep {ROLE_LABEL[user.role]}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}