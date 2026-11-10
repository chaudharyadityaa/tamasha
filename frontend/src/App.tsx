import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/guards'
import { AppLayout } from './components/layout/AppLayout'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { BookingPage } from './pages/BookingPage'
import { BookingTicketsPage } from './pages/BookingTicketsPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage'
import { OrganizerEventFormPage } from './pages/OrganizerEventFormPage'
import { OrganizerEventPage } from './pages/OrganizerEventPage'
import { OrganizerVenuesPage } from './pages/OrganizerVenuesPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { SeatSelectionPage } from './pages/SeatSelectionPage'

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
                  <Outlet />
                </RequireRole>
              }
            >
              <Route index element={<OrganizerDashboardPage />} />
              <Route path="venues" element={<OrganizerVenuesPage />} />
              <Route path="events/new" element={<OrganizerEventFormPage mode="create" />} />
              <Route path="events/:id" element={<OrganizerEventPage />} />
              <Route path="events/:id/edit" element={<OrganizerEventFormPage mode="edit" />} />
            </Route>
            <Route
              path="admin/*"
              element={
                <RequireRole roles={['ADMIN']}>
                  <PlaceholderPage title="Admin dashboard" description="Platform administration arrives in a later checkpoint." />
                </RequireRole>
              }
            />
            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}