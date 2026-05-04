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

// Trust the first proxy in front of us (nginx, cloudflare, docker network) so
// req.ip and req.protocol reflect the real client. WITHOUT this, every request
// looks like 127.0.0.1 to express-rate-limit and brute-force protection breaks.
// Set TRUST_PROXY_HOPS in env if multiple proxies are chained.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1))

// ── Security & Performance ────────────────────────────────────────────────────
// CSP policy compatible with Vite-built React SPA + same-origin API + WS for
// socket.io + Google Fonts. Inline styles allowed because Tailwind/shadcn
// injects style tags at runtime.
//
// IMPORTANT: explicitly null upgradeInsecureRequests — helmet adds it by
// default, which makes the browser rewrite every HTTP asset URL to HTTPS,
// causing ERR_SSL_PROTOCOL_ERROR when the app is served over plain HTTP.
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'blob:'],
  connectSrc: ["'self'", 'ws:', 'wss:'],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: null,
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // HSTS disabled — we're served over plain HTTP. If TLS is added later
    // (via reverse proxy), set this back to default.
    hsts: false,
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production' ? { directives: cspDirectives } : false,
  }),
)

// CORS — only allow origins explicitly listed in CORS_ORIGINS env (comma-separated).
// Same-origin requests (no Origin header) and server-to-server tools are always allowed.
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true) // same-origin / curl / mobile
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
    // Browser ẩn mọi response header không-safelisted trừ khi expose. Sliding
    // session yêu cầu client đọc được X-New-Token.
    exposedHeaders: ['X-New-Token'],
  }),
)
app.use(compression())

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Static Files ──────────────────────────────────────────────────────────────
// Resolve paths from cwd, not __dirname — the dist/ depth differs between
// `tsx watch` (server/src) and Docker (/app/dist), so a relative-to-__dirname
// path resolves to / in the container and breaks uploads serving.
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadDir))

// ── Serve React client in production ─────────────────────────────────────────
const clientPath = path.resolve(process.cwd(), 'public')
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
