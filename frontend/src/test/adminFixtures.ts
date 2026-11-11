import type { AdminBookingRow, AdminDashboard, AdminEvent, AdminUser } from '../api/adminTypes'

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

export function makeAdminEvent(overrides: Partial<AdminEvent> = {}): AdminEvent {
  return {
    id: 21,
    title: 'Sitar Evening',
    status: 'PUBLISHED',
    seatingMode: 'GENERAL_ADMISSION',
    organizerId: 5,
    organizerName: 'Asha Events',
    venueName: 'City Hall',
    city: 'Agra',
    startsAt: '2027-01-10T13:30:00Z',
    endsAt: '2027-01-10T16:30:00Z',
    startingPrice: 499.5,
    createdAt: '2026-11-01T08:00:00Z',
    ...overrides,
  }
}

export function makeAdminBookingRow(overrides: Partial<AdminBookingRow> = {}): AdminBookingRow {
  return {
    id: 31,
    reference: 'EH-ADMIN00001',
    status: 'CONFIRMED',
    customerName: 'Ana Rao',
    customerEmail: 'ana@example.com',
    eventId: 21,
    eventTitle: 'Sitar Evening',
    currency: 'INR',
    totalAmount: 999,
    createdAt: '2026-12-01T10:00:00Z',
    expiresAt: '2026-12-01T10:15:00Z',
    ...overrides,
  }
}