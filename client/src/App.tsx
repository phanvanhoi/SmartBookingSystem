import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import RoomMapPage from './pages/rooms/RoomMapPage'
import TimelinePage from './pages/rooms/TimelinePage'
import OrderPage from './pages/orders/OrderPage'
import CustomerListPage from './pages/customers/CustomerListPage'
import CustomerDetailPage from './pages/customers/CustomerDetailPage'
import StockPage from './pages/stock/StockPage'
import StaffPage from './pages/staff/StaffPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReportsPage from './pages/reports/ReportsPage'
import LoginPage from './pages/auth/LoginPage'
import SettingsPage from './pages/settings/SettingsPage'
import FacebookInboxPage from './pages/facebook/FacebookInboxPage'
import { useAuthStore } from './stores/authStore'
import { useSocket } from './hooks/useSocket'

// ────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ────────────────────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ────────────────────────────────────────────────────────────────────────────
// Socket initializer – runs only when authenticated
// ────────────────────────────────────────────────────────────────────────────

function SocketInitializer() {
  useSocket()
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// App
// ────────────────────────────────────────────────────────────────────────────

function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">{subtitle ?? 'Module này đang được phát triển...'}</p>
      </div>
    </div>
  )
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Hydrate auth state from localStorage on first render
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <>
      {/* Connect socket only when authenticated */}
      {isAuthenticated && <SocketInitializer />}

      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with MainLayout */}
        <Route
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/rooms" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomMapPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/orders" element={<OrderPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/facebook" element={<FacebookInboxPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/rooms" replace />} />
        </Route>
      </Routes>
    </>
  )
}
