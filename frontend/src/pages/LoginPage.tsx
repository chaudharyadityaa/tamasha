import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { toApiError, userMessage } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import { AuthShell } from '../components/auth/AuthShell'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { validateEmail } from '../lib/validation'

/** Only accept a return path inside this app, so a crafted link cannot send people to another site. */
function safeReturnPath(state: unknown): string {
  const from = typeof state === 'object' && state !== null ? (state as { from?: unknown }).from : undefined
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

interface FieldErrors {
  email?: string
  password?: string
}

export function LoginPage() {
  const { status, login, sessionExpired } = useAuth()
  const location = useLocation()
  const returnTo = safeReturnPath(location.state)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to={returnTo} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const found: FieldErrors = {}
    const emailProblem = validateEmail(email)
    if (emailProblem) {
      found.email = emailProblem
    }
    if (!password) {
      found.password = 'Enter your password.'
    }
    setErrors(found)
    if (found.email || found.password) {
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (error: unknown) {
      const apiError = toApiError(error)
      if (apiError.status === 401) {
        setFormError('Invalid email or password.')
      } else {
        setFormError(userMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell panelTitle="Front row is one login away." panelText="Pick up where you left off: your bookings, your tickets and your next night out.">
      <h1 className="font-display text-3xl font-extrabold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Log in to see your bookings and tickets.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-xl bg-white p-6 shadow-xl ring-1 ring-black/5">
        {sessionExpired && <Alert variant="info">Your session ended. Please log in again.</Alert>}
        {formError && <Alert variant="error">{formError}</Alert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />

        <Button type="submit" loading={submitting} className="w-full py-3">
          Log in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-medium text-indigo-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}