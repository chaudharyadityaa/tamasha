import type { Role } from '../api/types'

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Customer',
  ORGANIZER: 'Organizer',
  ADMIN: 'Administrator',
}

export const ROLE_TONE: Record<Role, 'neutral' | 'info' | 'warning'> = {
  CUSTOMER: 'neutral',
  ORGANIZER: 'info',
  ADMIN: 'warning',
}

export const ROLES: Role[] = ['CUSTOMER', 'ORGANIZER', 'ADMIN']