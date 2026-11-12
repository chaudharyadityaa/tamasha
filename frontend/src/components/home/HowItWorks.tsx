const STEPS = [
  {
    title: 'Choose your seats or tickets',
    text: 'Pick exact seats on a live seat map, or simply choose how many tickets you want.',
  },
  {
    title: 'We hold them while you pay',
    text: 'Your choice is reserved for a few minutes, so nobody can take it from under you.',
  },
  {
    title: 'Scan the QR code at the door',
    text: 'Your tickets are ready the moment you pay, with a QR code for quick entry.',
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-20 bg-white py-16">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 id="how-heading" className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            From first look to front row
          </h2>
          <p className="mt-4 max-w-md text-slate-600">Booking takes three steps, and every one of them keeps your seat safe.</p>
          <p className="mt-6 max-w-md text-sm text-slate-500">
            EventHub is a portfolio project. Payments are simulated, so no real money moves.
          </p>
        </div>
        <ol className="space-y-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-5">
              <span aria-hidden="true" className="font-display text-6xl font-extrabold leading-none text-indigo-200">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}