import type { ReactElement } from 'react'
import { hashString, posterTheme } from '../../lib/poster'
import type { PosterTheme } from '../../lib/poster'
import { mulberry32 } from '../../lib/prng'

interface PatternProps {
  theme: PosterTheme
  cx: number
  cy: number
  hash: number
}

function Rings({ theme, cx, cy }: PatternProps) {
  return (
    <>
      <g fill="none" stroke={theme.fg} strokeOpacity="0.3" strokeWidth="12">
        {Array.from({ length: 12 }, (_, index) => (
          <circle key={index} cx={cx} cy={cy} r={48 + index * 38} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="62" fill={theme.accent} />
      <circle cx={cx} cy={cy} r="12" fill={theme.bg} />
    </>
  )
}

function Dots({ theme, cx, cy }: PatternProps) {
  const dots: ReactElement[] = []
  for (let rowIndex = 0; rowIndex < 16; rowIndex += 1) {
    for (let col = 0; col < 13; col += 1) {
      const x = 14 + col * 31
      const y = 14 + rowIndex * 31
      const radius = 15 - Math.hypot(x - cx, y - cy) / 18
      if (radius > 1.5) {
        dots.push(<circle key={`${rowIndex}-${col}`} cx={x} cy={y} r={radius} />)
      }
    }
  }
  return (
    <>
      <g fill={theme.fg} fillOpacity="0.55">
        {dots}
      </g>
      <circle cx={cx > 200 ? 90 : 320} cy="430" r="96" fill={theme.accent} />
    </>
  )
}

function Curtain({ theme, cx }: PatternProps) {
  return (
    <>
      {Array.from({ length: 10 }, (_, index) => (
        <rect key={index} x={index * 40} y="0" width="20" height="500" fill={theme.fg} fillOpacity="0.14" />
      ))}
      <ellipse cx={cx} cy="170" rx="150" ry="125" fill={theme.accent} fillOpacity="0.9" />
      <ellipse cx={cx} cy="170" rx="86" ry="70" fill={theme.fg} />
      <rect y="420" width="400" height="80" fill="#000" fillOpacity="0.25" />
    </>
  )
}

function Stripes({ theme, cx, cy }: PatternProps) {
  return (
    <>
      <g transform="rotate(-24 200 250)">
        {Array.from({ length: 12 }, (_, index) => (
          <rect
            key={index}
            x="-250"
            y={-150 + index * 72}
            width="900"
            height="34"
            fill={index % 3 === 0 ? theme.accent : theme.fg}
            fillOpacity={index % 3 === 0 ? 0.9 : 0.2}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy + 70} r="86" fill={theme.fg} />
      <circle cx={cx} cy={cy + 70} r="86" fill="none" stroke={theme.bg} strokeWidth="6" strokeDasharray="14 10" />
    </>
  )
}

function Burst({ theme, cx, cy }: PatternProps) {
  const rays = 24
  const reach = 700
  return (
    <>
      {Array.from({ length: rays }, (_, index) => {
        if (index % 2 === 1) {
          return null
        }
        const from = (index * 2 * Math.PI) / rays
        const to = ((index + 1) * 2 * Math.PI) / rays
        const points = `${cx},${cy} ${cx + reach * Math.cos(from)},${cy + reach * Math.sin(from)} ${cx + reach * Math.cos(to)},${cy + reach * Math.sin(to)}`
        return <polygon key={index} points={points} fill={theme.fg} fillOpacity="0.2" />
      })}
      <circle cx={cx} cy={cy} r="58" fill={theme.accent} />
      <circle cx={cx} cy={cy} r="30" fill={theme.fg} />
    </>
  )
}

function Grid({ theme, hash }: PatternProps) {
  const rand = mulberry32(hash)
  const cells: ReactElement[] = []
  for (let rowIndex = 0; rowIndex < 10; rowIndex += 1) {
    for (let col = 0; col < 8; col += 1) {
      const roll = rand()
      const x = col * 50
      const y = rowIndex * 50
      const key = `${rowIndex}-${col}`
      if (roll < 0.14) {
        cells.push(<rect key={key} x={x} y={y} width="50" height="50" fill={theme.accent} />)
      } else if (roll < 0.34) {
        cells.push(<rect key={key} x={x} y={y} width="50" height="50" fill={theme.fg} fillOpacity="0.22" />)
      } else if (roll < 0.5) {
        cells.push(<circle key={key} cx={x + 25} cy={y + 25} r="20" fill={theme.fg} fillOpacity="0.5" />)
      }
    }
  }
  return <>{cells}</>
}

function Waves({ theme, cx }: PatternProps) {
  return (
    <>
      <circle cx={cx} cy="120" r="72" fill={theme.accent} />
      {Array.from({ length: 8 }, (_, index) => {
        const y = 170 + index * 46
        return (
          <path
            key={index}
            d={`M0 ${y} Q 100 ${y - 44} 200 ${y} T 400 ${y} V 520 H 0 Z`}
            fill={index % 2 ? theme.bg : theme.fg}
            fillOpacity={index % 2 ? 1 : 0.2}
          />
        )
      })}
    </>
  )
}

function Pattern(props: PatternProps) {
  switch (props.theme.pattern) {
    case 'rings':
      return <Rings {...props} />
    case 'dots':
      return <Dots {...props} />
    case 'curtain':
      return <Curtain {...props} />
    case 'stripes':
      return <Stripes {...props} />
    case 'burst':
      return <Burst {...props} />
    case 'grid':
      return <Grid {...props} />
    case 'waves':
      return <Waves {...props} />
  }
}

interface PosterArtProps {
  /** Decides the colors and the pattern: music gets vinyl rings, comedy gets halftone dots, and so on. */
  category: string
  /** Varies the artwork between events of the same category. The same seed always draws the same poster. */
  seed: string
  className?: string
}

/** Original poster artwork drawn in code, so every event looks good even without a photo. */
export function PosterArt({ category, seed, className }: PosterArtProps) {
  const theme = posterTheme(category)
  const hash = hashString(seed)
  const cx = 130 + (hash % 140)
  const cy = 130 + ((hash >>> 9) % 130)
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="500" fill={theme.bg} />
      <Pattern theme={theme} cx={cx} cy={cy} hash={hash} />
    </svg>
  )
}