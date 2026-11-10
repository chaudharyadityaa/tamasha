import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  error?: string | null
  hint?: string
  children: ReactNode
}

export function SelectField({ label, error, hint, className = '', children, ...rest }: SelectFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const showHint = Boolean(hint) && !error
  const describedBy = [showHint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {showHint && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}