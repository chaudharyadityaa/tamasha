import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { BRAND } from './brand'

describe('BRAND', () => {
  it('builds its texts from the name', () => {
    expect(BRAND.homeTitle).toBe(`${BRAND.name}: ${BRAND.tagline.toLowerCase()}`)
    expect(BRAND.description).toContain(BRAND.name)
    expect(BRAND.portfolioNote).toContain(BRAND.name)
  })

  it('matches the static page head in index.html, which cannot import it', () => {
    expect(indexHtml).toContain(`<title>${BRAND.name}</title>`)
    expect(indexHtml).toContain(`<meta name="description" content="${BRAND.description}" />`)
    expect(indexHtml).toContain(`<meta property="og:site_name" content="${BRAND.name}" />`)
    expect(indexHtml).toContain(`<meta property="og:title" content="${BRAND.homeTitle}" />`)
  })
})