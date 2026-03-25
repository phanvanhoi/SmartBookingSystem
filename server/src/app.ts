import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import { errorMiddleware } from './middleware/error.middleware'

// ── Route imports ─────────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes'
import roomRoutes from './modules/rooms/room.routes'
import sessionRoutes from './modules/rooms/session.routes'
import bookingRoutes from './modules/rooms/booking.routes'
import queueRoutes from './modules/rooms/queue.routes'
import orderRoutes from './modules/orders/order.routes'
import menuRoutes from './modules/menu/menu.routes'
import checkoutRoutes from './modules/checkout/checkout.routes'
import stockRoutes from './modules/stock/stock.routes'
import customerRoutes from './modules/customers/customer.routes'
import staffRoutes from './modules/staff/staff.routes'
import shiftRoutes from './modules/shifts/shift.routes'
import reportRoutes from './modules/reports/report.routes'
import settingRoutes from './modules/settings/setting.routes'
import notificationRoutes from './modules/notifications/notification.routes'
import facebookRoutes from './modules/facebook/facebook.routes'

const app = express()

// ── Security & Performance ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))
app.use(cors({ origin: true, credentials: true }))
app.use(compression())

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static Files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

// ── Serve React client in production ─────────────────────────────────────────
const clientPath = path.join(__dirname, '../public')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientPath))
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/rooms', roomRoutes)
app.use('/api/v1/sessions', sessionRoutes)
app.use('/api/v1/bookings', bookingRoutes)
app.use('/api/v1/waiting-queue', queueRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/menu', menuRoutes)
app.use('/api/v1/checkout', checkoutRoutes)
app.use('/api/v1/stock', stockRoutes)
app.use('/api/v1/customers', customerRoutes)
app.use('/api/v1/staff', staffRoutes)
app.use('/api/v1/shifts', shiftRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/settings', settingRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/facebook', facebookRoutes)

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Music Box Manager API is running',
    timestamp: new Date().toISOString(),
  })
})

// ── SPA fallback (production) ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'))
  })
}

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorMiddleware)

export default app
