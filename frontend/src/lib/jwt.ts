interface JwtPayload {
  exp?: number
  sub?: string
}

/**
 * Reads the payload of a JWT WITHOUT verifying it. We only use it to know when the token expires,
 * so the app can log out in time. The server is the one that verifies tokens.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  try {
    const base64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    const payload: unknown = JSON.parse(json)
    return typeof payload === 'object' && payload !== null ? (payload as JwtPayload) : null
  } catch {
    return null
  }
}

/** Expiry time in milliseconds since 1970, or null if the token cannot be read. */
export function expiresAtMs(token: string): number | null {
  const payload = decodeJwtPayload(token)
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null
}

/** A token we cannot read counts as expired (fail closed). */
export function isExpired(token: string, nowMs: number = Date.now(), skewSeconds = 10): boolean {
  const expiresAt = expiresAtMs(token)
  return expiresAt === null || expiresAt - skewSeconds * 1000 <= nowMs
}