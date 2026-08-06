import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import logger from '../utils/logger'

// Prisma error shape (not imported from @prisma/client as it's a stub in this env)
interface PrismaKnownError {
  code: string
  meta?: Record<string, unknown>
  message: string
  name: string
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'name' in err &&
    (err as { name: string }).name === 'PrismaClientKnownRequestError'
  )
}

function isPrismaValidationError(err: unknown): err is { message: string; name: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'PrismaClientValidationError'
  )
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
    })
    return
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token đã hết hạn',
      },
    })
    return
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Token không hợp lệ',
      },
    })
    return
  }

  // Prisma known request errors
  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      const target = err.meta?.['target']
      const fields = Array.isArray(target) ? (target as string[]).join(', ') : 'unknown'
      res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_VIOLATION',
          message: `Dữ liệu đã tồn tại (${fields})`,
        },
      })
      return
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy dữ liệu',
        },
      })
      return
    }

    logger.error('Prisma known error', { code: err.code, message: err.message, url: req.url })
    res.status(400).json({
      success: false,
      error: {
        code: `PRISMA_${err.code}`,
        message: 'Lỗi cơ sở dữ liệu',
      },
    })
    return
  }

  // Prisma validation error
  if (isPrismaValidationError(err)) {
    logger.error('Prisma validation error', {
      message: (err as { message: string }).message,
      url: req.url,
    })
    res.status(400).json({
      success: false,
      error: {
        code: 'DB_VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ cho cơ sở dữ liệu',
      },
    })
    return
  }

  // AppError (custom errors thrown from services)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    })
    return
  }

  // Malformed JSON body (or non-JSON posted as application/json) — often scanners (/JNAP/).
  // Check before hasStatusCode — body-parser SyntaxError also carries statusCode 400.
  if (err instanceof SyntaxError || isBodyParserSyntaxError(err)) {
    logger.warn('Rejected malformed JSON body', {
      url: req.url,
      method: req.method,
      ip: req.ip,
    })
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Body JSON không hợp lệ',
      },
    })
    return
  }

  // Duck-typed service errors: `createError()` attaches statusCode/code on a plain Error
  // (booking/session/queue/room). Treat as intentional client/business responses.
  if (hasStatusCode(err)) {
    const status = err.statusCode
    const code = typeof err.code === 'string' ? err.code : 'ERROR'
    if (status >= 500) {
      logger.error(err.message, { code, url: req.url, method: req.method })
    }
    res.status(status).json({
      success: false,
      error: {
        code,
        message: err.message,
      },
    })
    return
  }

  // CORS package may still throw if misconfigured; scanners spoof Origin often.
  if (err instanceof Error && /^CORS:/i.test(err.message)) {
    logger.warn('Rejected CORS origin', {
      message: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    })
    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_DENIED',
        message: 'Origin không được phép',
      },
    })
    return
  }

  // Malformed URL probes (/%c0, %2e%2e, invalid UTF-8) — scanners, not app bugs.
  // Express throws URIError while matching routes / serve-static.
  if (
    err instanceof URIError ||
    (err instanceof Error && /Failed to decode param/i.test(err.message))
  ) {
    logger.warn('Rejected malformed URL', {
      url: req.url,
      method: req.method,
      ip: req.ip,
    })
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'URL không hợp lệ',
      },
    })
    return
  }

  // Generic error
  const error = err as Error
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  })

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Đã xảy ra lỗi server',
    },
  })
}

type StatusCodedError = Error & { statusCode: number; code?: string }

function hasStatusCode(err: unknown): err is StatusCodedError {
  if (!(err instanceof Error)) return false
  const status = (err as { statusCode?: unknown }).statusCode
  return typeof status === 'number' && status >= 400 && status < 600
}

/** body-parser attaches `status`/`statusCode`/`type` on SyntaxError for bad JSON. */
function isBodyParserSyntaxError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const e = err as Error & { status?: number; statusCode?: number; type?: string }
  const status = e.status ?? e.statusCode
  return (
    e.type === 'entity.parse.failed' ||
    (status === 400 && /JSON|Unexpected token|in JSON/i.test(e.message))
  )
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
