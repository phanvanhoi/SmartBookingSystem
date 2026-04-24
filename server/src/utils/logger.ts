import path from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const isProduction = process.env.NODE_ENV === 'production'

// Resolve from cwd (server/ in dev, /app in Docker) — never from __dirname,
// which differs between dist/ and src/ depths.
const logDir = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(process.cwd(), 'logs')

// Rotate daily, keep 14 days of history, cap each file at 20MB. Prevents the
// logs volume from filling the disk on a long-running VPS.
const rotateOptions = {
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
}

const transports: winston.transport[] = []

// Always log to console — survives any file/volume permission issue and is
// what `docker logs` shows. Production logs are captured by Docker anyway.
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: !isProduction }),
      winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
        const mod = module ? `[${module as string}]` : ''
        const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : ''
        return `${timestamp as string} ${level} ${mod} ${message as string}${metaStr}`
      }),
    ),
  }),
)

// File transports are best-effort — if the volume is unwritable (eg. owned
// by root after a previous run) we fall back to console-only instead of
// crashing the process.
function safeFileTransport(filename: string, level?: string) {
  try {
    const t = new DailyRotateFile({
      ...rotateOptions,
      filename,
      ...(level ? { level } : {}),
    })
    t.on('error', (err) => {
      // Don't let unwritable log files take down the app — but make the
      // failure visible so ops can fix volume permissions.
      console.error(`[logger] file transport "${filename}" error:`, err)
    })
    return t
  } catch (err) {
    console.error(`[logger] failed to create file transport "${filename}":`, err)
    return null
  }
}

const errFile = safeFileTransport('error-%DATE%.log', 'error')
if (errFile) transports.push(errFile)
const combinedFile = safeFileTransport('combined-%DATE%.log')
if (combinedFile) transports.push(combinedFile)

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'music-box' },
  transports,
})

export default logger
