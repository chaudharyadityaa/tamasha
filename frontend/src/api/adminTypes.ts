import type { Role } from './types'

export interface AdminUser {
  id: number
  email: string
  fullName: string
  role: Role
  enabled: boolean
  createdAt: string
}

export interface UsersParams {
  role?: Role
  enabled?: boolean
  q?: string
  /** 0-based, as the API expects. */
  page: number
  size: number
}

export interface DashboardUsers {
  total: number
  disabled: number
  /** Role name to number of users. */
  byRole: Record<string, number>
}

export interface DashboardEvents {
  total: number
  upcomingPublished: number
  /** Event status name to number of events. */
  byStatus: Record<string, number>
}

export interface DashboardBookings {
  total: number
  /** Booking status name to number of bookings. */
  byStatus: Record<string, number>
}

export interface DashboardTickets {
  total: number
  valid: number
  checkedIn: number
  voided: number
}

/** Revenue is reported per currency, so amounts in different currencies are never added together. */
export interface RevenueLine {
  currency: string
  amount: number
}

export interface AdminDashboard {
  generatedAt: string
  users: DashboardUsers
  events: DashboardEvents
  bookings: DashboardBookings
  tickets: DashboardTickets
  confirmedRevenue: RevenueLine[]
  demoPaymentsEnabled: boolean
}