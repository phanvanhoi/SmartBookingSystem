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
import { useAuthStore, type UserRole } from './stores/authStore'
import { useSocket } from './hooks/useSocket'
import { ShieldAlert } from 'lucide-react'

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
// Role Guard
// ────────────────────────────────────────────────────────────────────────────

function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const role = useAuthStore((s) => s.user?.role)
  if (!role) return <Navigate to="/login" replace />
  if (!roles.includes(role)) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn không có quyền xem trang này. Vui lòng liên hệ chủ quán nếu cần.
          </p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

const MANAGEMENT: UserRole[] = ['OWNER', 'MANAGER']
const CASHIER_UP: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER']
const OWNER_ONLY: UserRole[] = ['OWNER']

function defaultLandingPath(role?: UserRole) {
  if (!role) return '/login'
  if (role === 'STAFF') return '/rooms'
  return '/rooms'
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

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.user?.role)
  const landing = defaultLandingPath(role)

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
          <Route path="/" element={<Navigate to={landing} replace />} />

          <Route
            path="/dashboard"
            element={
              <RequireRole roles={MANAGEMENT}>
                <DashboardPage />
              </RequireRole>
            }
          />
          <Route path="/rooms" element={<RoomMapPage />} />
          <Route
            path="/timeline"
            element={
              <RequireRole roles={CASHIER_UP}>
                <TimelinePage />
              </RequireRole>
            }
          />
          <Route path="/orders" element={<OrderPage />} />
          <Route
            path="/stock"
            element={
              <RequireRole roles={MANAGEMENT}>
                <StockPage />
              </RequireRole>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireRole roles={CASHIER_UP}>
                <CustomerListPage />
              </RequireRole>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireRole roles={CASHIER_UP}>
                <CustomerDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/facebook"
            element={
              <RequireRole roles={MANAGEMENT}>
                <FacebookInboxPage />
              </RequireRole>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireRole roles={MANAGEMENT}>
                <ReportsPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff"
            element={
              <RequireRole roles={MANAGEMENT}>
                <StaffPage />
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireRole roles={OWNER_ONLY}>
                <SettingsPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to={landing} replace />} />
        </Route>
      </Routes>
    </>
  )
}
