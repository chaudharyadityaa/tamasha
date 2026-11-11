import type { AdminDashboard, AdminUser } from '../api/adminTypes'

export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 2,
    email: 'ana@example.com',
    fullName: 'Ana Rao',
    role: 'CUSTOMER',
    enabled: true,
    createdAt: '2026-10-01T09:30:00Z',
    ...overrides,
  }
}

export function makeDashboard(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    generatedAt: '2026-11-11T09:00:00Z',
    users: { total: 12, disabled: 2, byRole: { ADMIN: 1, CUSTOMER: 9, ORGANIZER: 2 } },
    events: { total: 8, upcomingPublished: 5, byStatus: { CANCELLED: 1, DRAFT: 2, PUBLISHED: 5 } },
    bookings: { total: 20, byStatus: { CANCELLED: 3, CONFIRMED: 14, EXPIRED: 1, PENDING_PAYMENT: 2 } },
    tickets: { total: 30, valid: 24, checkedIn: 4, voided: 2 },
    confirmedRevenue: [{ currency: 'INR', amount: 15998.5 }],
    demoPaymentsEnabled: true,
    ...overrides,
  }
}