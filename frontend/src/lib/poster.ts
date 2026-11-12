export type PosterPattern = 'rings' | 'dots' | 'curtain' | 'stripes' | 'burst' | 'grid' | 'waves'

export interface PosterTheme {
  bg: string
  fg: string
  accent: string
  pattern: PosterPattern
}

const MUSIC: PosterTheme = { bg: '#3b1fa8', fg: '#ffb627', accent: '#ff4d8d', pattern: 'rings' }
const COMEDY: PosterTheme = { bg: '#ffb627', fg: '#2a1450', accent: '#ff4d8d', pattern: 'dots' }
const THEATRE: PosterTheme = { bg: '#7a1230', fg: '#ffd9a8', accent: '#ffb627', pattern: 'curtain' }
const SPORTS: PosterTheme = { bg: '#0e6b5c', fg: '#e8fff6', accent: '#ffb627', pattern: 'stripes' }
const FESTIVAL: PosterTheme = { bg: '#ff4d8d', fg: '#2a1450', accent: '#ffe9a8', pattern: 'burst' }
const CONFERENCE: PosterTheme = { bg: '#1e3a8a', fg: '#dce8ff', accent: '#6ee7f9', pattern: 'grid' }
const WAVES: PosterTheme = { bg: '#5a2fea', fg: '#f1eeff', accent: '#ffb627', pattern: 'waves' }

/** Words that decide an event's look. The first match wins. */
const KEYWORDS: [string, PosterTheme][] = [
  ['music', MUSIC],
  ['concert', MUSIC],
  ['ghazal', MUSIC],
  ['classical', MUSIC],
  ['band', MUSIC],
  ['comedy', COMEDY],
  ['stand', COMEDY],
  ['theatre', THEATRE],
  ['theater', THEATRE],
  ['drama', THEATRE],
  ['dance', THEATRE],
  ['play', THEATRE],
  ['sport', SPORTS],
  ['cricket', SPORTS],
  ['football', SPORTS],
  ['match', SPORTS],
  ['festival', FESTIVAL],
  ['fair', FESTIVAL],
  ['conference', CONFERENCE],
  ['workshop', CONFERENCE],
  ['talk', CONFERENCE],
  ['meetup', CONFERENCE],
]

const FALLBACKS: PosterTheme[] = [WAVES, CONFERENCE, FESTIVAL, THEATRE]

/** A stable number for a piece of text (FNV-1a), used to vary artwork and to pick a look. */
export function hashString(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** The look of a category. Unknown categories get a stable look picked from the name, never a random one. */
export function posterTheme(category: string): PosterTheme {
  const key = category.trim().toLowerCase()
  for (const [word, theme] of KEYWORDS) {
    if (key.includes(word)) {
      return theme
    }
  }
  return FALLBACKS[hashString(key) % FALLBACKS.length]!
}