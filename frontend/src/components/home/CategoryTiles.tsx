import { Link } from 'react-router-dom'
import { HOME_CATEGORIES } from '../../lib/homeCategories'
import { posterTheme } from '../../lib/poster'
import { PosterArt } from '../art/PosterArt'

export function CategoryTiles() {
  return (
    <section aria-labelledby="kinds-heading" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h2 id="kinds-heading" className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">
        Pick your kind of night
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-4 md:auto-rows-[10.5rem] md:grid-cols-3">
        {HOME_CATEGORIES.map((category, index) => {
          const theme = posterTheme(category)
          return (
            <li key={category} className={index === 0 ? 'md:row-span-2' : ''}>
              <Link
                to={`/events?category=${encodeURIComponent(category)}`}
                className="group relative block h-full min-h-36 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                <PosterArt
                  category={category}
                  seed={category}
                  className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute bottom-3 left-3 rounded-sm px-3 py-1 font-display text-xl font-bold"
                  style={{ background: theme.fg, color: theme.bg }}
                >
                  {category}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}