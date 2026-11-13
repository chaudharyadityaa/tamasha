import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/guards'
import { AdminLayout } from './components/layout/AdminLayout'
import { AppLayout } from './components/layout/AppLayout'
import { OrganizerLayout } from './components/layout/OrganizerLayout'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { BookingPage } from './pages/BookingPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'

// Pages that most visitors never open are loaded only when someone navigates to them.
// This keeps the first download small: a customer never downloads the organizer or admin code.
const SeatSelectionPage = lazy(() => import('./pages/SeatSelectionPage').then((m) => ({ default: m.SeatSelectionPage })))
const BookingTicketsPage = lazy(() => import('./pages/BookingTicketsPage').then((m) => ({ default: m.BookingTicketsPage })))

const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage').then((m) => ({ default: m.OrganizerDashboardPage })))
const OrganizerVenuesPage = lazy(() => import('./pages/OrganizerVenuesPage').then((m) => ({ default: m.OrganizerVenuesPage })))
const OrganizerSeatsPage = lazy(() => import('./pages/OrganizerSeatsPage').then((m) => ({ default: m.OrganizerSeatsPage })))
const OrganizerEventFormPage = lazy(() => import('./pages/OrganizerEventFormPage').then((m) => ({ default: m.OrganizerEventFormPage })))
const OrganizerEventPage = lazy(() => import('./pages/OrganizerEventPage').then((m) => ({ default: m.OrganizerEventPage })))
const OrganizerEventBookingsPage = lazy(() =>
  import('./pages/OrganizerEventBookingsPage').then((m) => ({ default: m.OrganizerEventBookingsPage })),
)
const OrganizerCheckInPage = lazy(() => import('./pages/OrganizerCheckInPage').then((m) => ({ default: m.OrganizerCheckInPage })))

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage').then((m) => ({ default: m.AdminEventsPage })))
const AdminBookingsPage = lazy(() => import('./pages/AdminBookingsPage').then((m) => ({ default: m.AdminBookingsPage })))
const AdminBookingDetailPage = lazy(() => import('./pages/AdminBookingDetailPage').then((m) => ({ default: m.AdminBookingDetailPage })))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="events/:id/seats" element={<SeatSelectionPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="bookings/:id"
              element={
                <RequireAuth>
                  <BookingPage />
                </RequireAuth>
              }
            />
            <Route
              path="bookings/:id/tickets"
              element={
                <RequireAuth>
                  <BookingTicketsPage />
                </RequireAuth>
              }
            />
            <Route
              path="my-bookings"
              element={
                <RequireAuth>
                  <MyBookingsPage />
                </RequireAuth>
              }
            />
            <Route
              path="organizer"
              element={
                <RequireRole roles={['ORGANIZER']}>
                  <OrganizerLayout />
                </RequireRole>
              }
            >
              <Route index element={<OrganizerDashboardPage />} />
              <Route path="venues" element={<OrganizerVenuesPage />} />
              <Route path="venues/:id/seats" element={<OrganizerSeatsPage />} />
              <Route path="events/new" element={<OrganizerEventFormPage mode="create" />} />
              <Route path="events/:id" element={<OrganizerEventPage />} />
              <Route path="events/:id/edit" element={<OrganizerEventFormPage mode="edit" />} />
              <Route path="events/:id/bookings" element={<OrganizerEventBookingsPage />} />
              <Route path="events/:id/check-in" element={<OrganizerCheckInPage />} />
            </Route>
            <Route
              path="admin"
              element={
                <RequireRole roles={['ADMIN']}>
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
            </Route>
            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}