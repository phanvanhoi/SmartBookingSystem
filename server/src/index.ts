import dotenv from 'dotenv'
// Dev: .env ở root project, Prod: env vars từ docker
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../.env' })
}

import http from 'http'
import app from './app'
import { setupSocket } from './socket/socketManager'
import { startRoomTimerChecker } from './socket/roomSocket'

const PORT = process.env.PORT || 3000

const server = http.createServer(app)

// Setup Socket.io
setupSocket(server)

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

export { server }
