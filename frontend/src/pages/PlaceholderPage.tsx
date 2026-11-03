export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-12 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  )
}