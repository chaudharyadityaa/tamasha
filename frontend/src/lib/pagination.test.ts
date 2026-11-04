import { describe, expect, it } from 'vitest'
import { pageWindow } from './pagination'

describe('pageWindow', () => {
  it('shows the ends, the current page and its neighbours, with gaps', () => {
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10])
  })

  it('shows every page when there are only a few', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(1, 1)).toEqual([1])
  })
})