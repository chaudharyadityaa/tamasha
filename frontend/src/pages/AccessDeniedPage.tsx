import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl font-bold text-red-600">403</p>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 text-slate-600">Your account does not have permission to open this page.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
        Back to events
      </Link>
    </div>
  )
}