import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toApiError, userMessage } from '../api/errors'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { validateEmail, validateFullName, validateNewPassword } from '../lib/validation'

interface FieldErrors {
  fullName?: string
  email?: string
  password?: string
  confirm?: string
}

export function RegisterPage() {
  const { status, register } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const found: FieldErrors = {}
    const nameProblem = validateFullName(fullName)
    const emailProblem = validateEmail(email)
    const passwordProblem = validateNewPassword(password)
    if (nameProblem) {
      found.fullName = nameProblem
    }
    if (emailProblem) {
      found.email = emailProblem
    }
    if (passwordProblem) {
      found.password = passwordProblem
    }
    if (!passwordProblem && confirm !== password) {
      found.confirm = 'The passwords do not match.'
    }
    setErrors(found)
    if (Object.keys(found).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password })
    } catch (error: unknown) {
      const apiError = toApiError(error)
      if (apiError.status === 409) {
        setErrors({ email: 'An account with this email already exists.' })
      } else if (apiError.status === 400 && Object.keys(apiError.fieldErrors).length > 0) {
        setErrors({
          fullName: apiError.fieldErrors.fullName,
          email: apiError.fieldErrors.email,
          password: apiError.fieldErrors.password,
        })
      } else {
        setFormError(userMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">It takes a minute. You can book tickets right after.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {formError && <Alert variant="error">{formError}</Alert>}

        <TextField
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={errors.fullName}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
        />

        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}