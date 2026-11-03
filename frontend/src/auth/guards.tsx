import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from './useAuth'

/**
 * These guards only decide which PAGES to show. They are a convenience, not security:
 * the backend independently checks the token and the role on every request.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Spinner label="Checking your session…" />
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Spinner label="Checking your session…" />
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />
  }
  return <>{children}</>
}