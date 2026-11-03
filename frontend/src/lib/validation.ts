const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Each function returns an error message, or null when the value is fine.
// These mirror the server's rules so people get instant feedback; the server still checks everything.

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) {
    return 'Enter your email address.'
  }
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.'
  }
  return null
}

export function validateNewPassword(value: string): string | null {
  if (value.length < 8) {
    return 'Use at least 8 characters.'
  }
  // BCrypt only reads the first 72 BYTES, so the server rejects longer passwords.
  if (new TextEncoder().encode(value).length > 72) {
    return 'Use at most 72 bytes (about 72 characters).'
  }
  return null
}

export function validateFullName(value: string): string | null {
  const name = value.trim()
  if (!name) {
    return 'Enter your name.'
  }
  if (name.length > 120) {
    return 'Use at most 120 characters.'
  }
  return null
}