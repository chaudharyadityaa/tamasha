import axe from 'axe-core'

/**
 * Audits part of a rendered page with axe-core and returns a short, readable list of problems.
 * Two checks are switched off because jsdom cannot do them: colour contrast needs real rendering,
 * and "all content in a landmark" is about whole pages, while these tests render one page at a time.
 * Colour contrast is covered by the Lighthouse run in the browser instead.
 */
export async function accessibilityProblems(element: Element) {
  const results = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    problem: violation.help,
    where: violation.nodes.map((node) => node.target.join(' ')),
  }))
}