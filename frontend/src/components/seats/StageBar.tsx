import { useSvgId } from '../art/useSvgId'

/** The stage at the front of the venue, with a cone of light falling on the seats below it. */
export function StageBar() {
  const id = useSvgId()
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 600 120" className="mx-auto mt-6 block h-24 w-full max-w-xl">
      <defs>
        <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb627" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffb627" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="90,46 510,46 600,120 0,120" fill={`url(#${id}-cone)`} />
      <path d="M50 46 Q300 -6 550 46 Z" fill="#ffb627" />
      <text x="300" y="36" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="3" fill="#170f2e">
        STAGE
      </text>
    </svg>
  )
}