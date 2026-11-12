import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { PageBand } from './PageBand'

describe('PageBand', () => {
  it('shows the title, the subtitle and whatever sits on the band', () => {
    render(
      <PageBand title="Find your night" subtitle="Search by name">
        <button type="button">Child control</button>
      </PageBand>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Find your night' })).toBeInTheDocument()
    expect(screen.getByText('Search by name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Child control' })).toBeInTheDocument()
  })

  it('lets the page move keyboard focus to the title', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(<PageBand title="Events" headingRef={ref} />)

    ref.current?.focus()

    expect(screen.getByRole('heading', { name: 'Events' })).toHaveFocus()
  })
})