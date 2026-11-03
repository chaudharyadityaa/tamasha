import { isExpired } from '../lib/jwt'

const KEY = 'eventhub.accessToken'

function read(): string | null {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

function clear(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Returns the stored token, or null. An expired token is removed the moment it is read. */
function getToken(): string | null {
  const token = read()
  if (token !== null && isExpired(token)) {
    clear()
    return null
  }
  return token
}

function setToken(token: string): void {
  try {
    window.sessionStorage.setItem(KEY, token)
  } catch {
    // Storage blocked: the session simply will not survive a page reload.
  }
}

/** sessionStorage: survives a reload, but not closing the tab, and is not shared between tabs. */
export const tokenStore = { getToken, setToken, clear }