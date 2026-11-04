/** Which page buttons to show: first, last, the current page and its neighbours, with gaps between. */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1])
  const sorted = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((current, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && current - previous > 1) {
      result.push('gap')
    }
    result.push(current)
  })
  return result
}