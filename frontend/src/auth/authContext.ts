import { createContext } from 'react'
import type { RegisterInput, User } from '../api/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** True after the server (or the clock) ended the session, so the login page can explain why. */
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<User>
  /** Creates the account, then logs in. */
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  clearSessionExpired: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)