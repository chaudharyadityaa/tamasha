import type { CSSProperties } from 'react'
import { useSvgId } from './useSvgId'

interface Beam {
  x: number
  spread: number
  color: string
  opacity: number
  from: number
  to: number
  delay: number
}

const BEAMS: Beam[] = [
  { x: 250, spread: 210, color: '#ff4d8d', opacity: 0.7, from: -5, to: 4, delay: 0 },
  { x: 640, spread: 170, color: '#ffb627', opacity: 0.65, from: 3, to: -4, delay: -3 },
  { x: 1010, spread: 230, color: '#8668ff', opacity: 0.7, from: -3, to: 5, delay: -6 },
  { x: 1370, spread: 180, color: '#ffb627', opacity: 0.55, from: 4, to: -3, delay: -2 },
]

/** Four light beams that slowly sweep across the stage. Purely decorative. */
export function StageLights() {
  const id = useSvgId()
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMin slice"
    >
      <defs>
        {BEAMS.map((beam, index) => (
          <linearGradient key={index} id={`${id}-beam-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={beam.color} stopOpacity={beam.opacity} />
            <stop offset="1" stopColor={beam.color} stopOpacity="0" />
          </linearGradient>
        ))}
        <radialGradient id={`${id}-glow`} cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor="#ff4d8d" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff4d8d" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="800" cy="900" rx="950" ry="220" fill={`url(#${id}-glow)`} />

      {BEAMS.map((beam, index) => (
        <g
          key={index}
          className="beam"
          style={
            {
              '--sway-from': `${beam.from}deg`,
              '--sway-to': `${beam.to}deg`,
              animationDelay: `${beam.delay}s`,
            } as CSSProperties
          }
        >
          <polygon
            points={`${beam.x},0 ${beam.x - beam.spread},900 ${beam.x + beam.spread},900`}
            fill={`url(#${id}-beam-${index})`}
            style={{ mixBlendMode: 'screen' }}
          />
        </g>
      ))}
    </svg>
  )
}