import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const isProduction = process.env.NODE_ENV === 'production'

// Rotate daily, keep 14 days of history, cap each file at 20MB. Prevents the
// logs volume from filling the disk on a long-running VPS.
const rotateOptions = {
  dirname: 'logs',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'music-box' },
  transports: [
    new DailyRotateFile({
      ...rotateOptions,
      filename: 'error-%DATE%.log',
      level: 'error',
    }),
    new DailyRotateFile({
      ...rotateOptions,
      filename: 'combined-%DATE%.log',
    }),
  ],
})

if (!isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
          const mod = module ? `[${module as string}]` : ''
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : ''
          return `${timestamp as string} ${level} ${mod} ${message as string}${metaStr}`
        }),
      ),
    }),
  )
}

export default logger
