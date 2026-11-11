/** A trimmed text parameter, cut to a sensible length. */
export function readText(search: URLSearchParams, key: string, maxLength = 100): string {
  return (search.get(key) ?? '').trim().slice(0, maxLength)
}

/** A whole number of 1 or more, as text. Returns "" when the parameter is missing or not such a number. */
export function readPositiveInteger(search: URLSearchParams, key: string): string {
  const value = (search.get(key) ?? '').trim()
  return /^\d{1,15}$/.test(value) && Number(value) >= 1 ? String(Number(value)) : ''
}