import dotenv from 'dotenv'
// Dev: .env ở root project, Prod: env vars từ docker
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../.env' })
}

import http from 'http'
import app from './app'
import { setupSocket } from './socket/socketManager'
import { startRoomTimerChecker } from './socket/roomSocket'
import { prisma } from './lib/prisma'
import logger from './utils/logger'

const PORT = process.env.PORT || 3000

const server = http.createServer(app)

// Setup Socket.io
const io = setupSocket(server)

// Start room timer checker cron
startRoomTimerChecker()

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎵 Music Box Manager API           ║
  ║   Running on: http://localhost:${PORT}  ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}        ║
  ╚═══════════════════════════════════════╝
  `)
})

// ── Graceful shutdown ───────────────────────────────────────────────────────
// Docker sends SIGTERM on `docker compose down/restart`; without a handler
// the process is killed mid-transaction ~10s later (default grace period),
// which can leave SQLite locked or orphan pending writes.
let shuttingDown = false
async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('Received shutdown signal, draining…', { signal })

  // Stop accepting new HTTP connections. Existing ones finish.
  server.close((err) => {
    if (err) logger.error('Error closing HTTP server', { err })
  })

  // Hard timeout: if we're still alive 10s later, exit anyway — better than
  // hanging forever and being SIGKILLed by the orchestrator.
  const forceExit = setTimeout(() => {
    logger.warn('Forcing exit after 10s drain timeout')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  try {
    io.close() // notifies connected clients
    await prisma.$disconnect()
    logger.info('Shutdown complete')
    process.exit(0)
  } catch (err) {
    logger.error('Error during shutdown', { err })
    process.exit(1)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

// Last-resort: log unhandled rejections/exceptions instead of silent crash.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason })
})
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err })
  void shutdown('SIGTERM')
})

export { server }
