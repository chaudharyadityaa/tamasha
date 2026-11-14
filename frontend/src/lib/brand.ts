/**
 * The product name and the short texts built around it. Everything people can read in the app comes from here,
 * so renaming the product is a change to this one file. The page head in index.html is plain HTML and cannot
 * import this file, so a test (brand.test.ts) fails if the two ever disagree.
 */
const name = 'Tamasha'
const tagline = 'Find your next night out'

export const BRAND = {
  name,
  tagline,
  /** The browser tab title of the home page. */
  homeTitle: `${name}: ${tagline.toLowerCase()}`,
  /** The description in the page head, for search results and link previews. */
  description: `Discover events, pick your seats and carry your tickets on your phone with ${name}.`,
  footerBlurb: 'Find a night out, pick your seats and carry your tickets on your phone.',
  portfolioNote: `${name} is a portfolio project. Payments are simulated: no real money moves.`,
} as const