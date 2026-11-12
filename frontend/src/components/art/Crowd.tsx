import { mulberry32 } from '../../lib/prng'

interface Person {
  x: number
  y: number
  r: number
  raised: boolean
  lean: number
}

function row(seed: number, count: number, baseY: number, minR: number, maxR: number): Person[] {
  const rand = mulberry32(seed)
  const step = 1700 / count
  return Array.from({ length: count }, (_, index) => ({
    x: index * step + step / 2 - 50 + (rand() - 0.5) * step * 0.6,
    y: baseY + (rand() - 0.5) * 22,
    r: minR + rand() * (maxR - minR),
    raised: rand() < 0.16,
    lean: (rand() - 0.5) * 10,
  }))
}

// Built once: the crowd is the same on every visit.
const BACK_ROW = row(7, 34, 118, 15, 21)
const FRONT_ROW = row(21, 22, 182, 24, 32)

function People({ people, fill }: { people: Person[]; fill: string }) {
  return (
    <g fill={fill} stroke={fill}>
      {people.map((person, index) => {
        const handX = person.x + person.r * 2.2 + person.lean
        const handY = person.y - person.r * 1.8
        return (
          <g key={index}>
            <circle cx={person.x} cy={person.y} r={person.r} stroke="none" />
            <ellipse cx={person.x + person.lean} cy={person.y + person.r * 2.4} rx={person.r * 2} ry={person.r * 1.7} stroke="none" />
            {person.raised && (
              <>
                <path
                  d={`M${person.x + person.r * 1.5} ${person.y + person.r * 1.8} L${handX} ${handY}`}
                  strokeWidth={person.r * 0.5}
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx={handX} cy={handY} r={person.r * 0.42} stroke="none" />
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

/** A silhouette of an audience, with a few raised arms, along the bottom of the hero. */
export function Crowd({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`block h-36 w-full sm:h-52 lg:h-64 ${className}`}
      viewBox="0 0 1600 260"
      preserveAspectRatio="xMidYMax slice"
    >
      <People people={BACK_ROW} fill="#100824" />
      <People people={FRONT_ROW} fill="#080414" />
      <rect x="0" y="205" width="1600" height="60" fill="#080414" />
    </svg>
  )
}