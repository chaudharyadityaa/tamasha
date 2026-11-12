import { describe, expect, it } from 'vitest'
import { hashString, posterTheme } from './poster'

describe('posterTheme', () => {
  it('gives each kind of event its own look', () => {
    expect(posterTheme('Music').pattern).toBe('rings')
    expect(posterTheme('Stand-up Comedy').pattern).toBe('dots')
    expect(posterTheme('Theatre').pattern).toBe('curtain')
    expect(posterTheme('Sports').pattern).toBe('stripes')
    expect(posterTheme('Food Festival').pattern).toBe('burst')
    expect(posterTheme('Workshop').pattern).toBe('grid')
  })

  it('ignores case and surrounding spaces', () => {
    expect(posterTheme('  MUSIC ')).toEqual(posterTheme('music'))
  })

  it('gives an unknown category the same look every time', () => {
    expect(posterTheme('Quilting')).toEqual(posterTheme('Quilting'))
    expect(['waves', 'grid', 'burst', 'curtain']).toContain(posterTheme('Quilting').pattern)
  })
})

describe('hashString', () => {
  it('is stable for the same text and differs for different text', () => {
    expect(hashString('Jazz Night')).toBe(hashString('Jazz Night'))
    expect(hashString('Jazz Night')).not.toBe(hashString('Jazz Nights'))
  })
})