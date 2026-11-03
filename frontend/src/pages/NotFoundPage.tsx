import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl font-bold text-indigo-600">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
        Back to events
      </Link>
    </div>
  )
}