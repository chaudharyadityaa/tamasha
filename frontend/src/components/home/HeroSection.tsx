import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { HOME_CATEGORIES } from '../../lib/homeCategories'
import { Crowd } from '../art/Crowd'
import { PosterArt } from '../art/PosterArt'
import { StageLights } from '../art/StageLights'

// Decorative posters for the hero. They illustrate kinds of events and do not claim any specific event exists.
const FAN = [
  { category: 'Music', caption: 'Live music', className: 'left-0 top-20 w-48 -rotate-[8deg]' },
  { category: 'Comedy', caption: 'Stand-up', className: 'left-24 top-0 z-10 w-56 rotate-[2deg]' },
  { category: 'Theatre', caption: 'Theatre', className: 'right-0 top-24 w-48 rotate-[9deg]' },
]

export function HeroSection() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = query.trim()
    void navigate(text ? `/events?q=${encodeURIComponent(text)}` : '/events')
  }

  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-midnight text-white">
      <StageLights />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 pb-44 pt-14 sm:px-6 sm:pb-56 lg:grid-cols-[1.1fr_0.9fr] lg:pb-64 lg:pt-20">
        <div>
          <h1
            id="hero-heading"
            className="text-balance font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Your next night out starts here.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/80">
            Concerts, comedy, theatre and more. Pick your exact seats, we hold them while you pay, and your tickets are
            ready on your phone.
          </p>

          <form onSubmit={handleSearch} role="search" className="mt-8 flex max-w-xl gap-2 rounded-full bg-white p-1.5 shadow-2xl">
            <label htmlFor="hero-search" className="sr-only">
              Search events by name
            </label>
            <input
              id="hero-search"
              type="search"
              maxLength={100}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events by name"
              className="min-w-0 flex-1 rounded-full bg-transparent px-5 text-midnight placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-marigold px-6 py-3 text-sm font-bold text-midnight transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Find events
            </button>
          </form>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Browse by kind of event">
            {HOME_CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  to={`/events?category=${encodeURIComponent(category)}`}
                  className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm text-white/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="relative mx-auto hidden h-[26rem] w-full max-w-md lg:block">
          {FAN.map((poster) => (
            <div key={poster.category} className={`absolute overflow-hidden rounded-md shadow-2xl ring-1 ring-white/15 ${poster.className}`}>
              <div className="aspect-[4/5]">
                <PosterArt category={poster.category} seed={poster.category} className="h-full w-full" />
              </div>
              <p className="bg-midnight/90 px-3 py-2 font-display text-lg font-bold">{poster.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <Crowd className="absolute inset-x-0 bottom-0 z-20" />
    </section>
  )
}