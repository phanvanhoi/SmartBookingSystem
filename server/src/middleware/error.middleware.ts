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

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}
