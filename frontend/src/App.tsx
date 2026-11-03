import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequireRole } from './auth/guards'
import { AppLayout } from './components/layout/AppLayout'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="events/:id"
              element={<PlaceholderPage title="Event details" description="The event page arrives in the next checkpoint." />}
            />
            <Route
              path="my-bookings"
              element={
                <RequireAuth>
                  <PlaceholderPage title="My bookings" description="Your bookings and tickets will appear here." />
                </RequireAuth>
              }
            />
            <Route
              path="organizer/*"
              element={
                <RequireRole roles={['ORGANIZER']}>
                  <PlaceholderPage title="Organizer dashboard" description="Event management arrives in a later checkpoint." />
                </RequireRole>
              }
            />
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