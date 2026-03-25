import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import logger from '../utils/logger'

function extractIpAddress(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor) {
    const first = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
    return first?.trim() ?? null
  }
  return req.socket.remoteAddress ?? null
}

export function auditLog(action: string, entityType: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const req = _req
    const originalJson = res.json.bind(res)

    res.json = function (body: unknown) {
      const statusCode = res.statusCode

      if (req.user && statusCode >= 200 && statusCode < 300) {
        const paramId = req.params['id']
        const entityId = paramId ? parseInt(String(paramId), 10) : 0
        const ipAddress = extractIpAddress(req)

        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action,
              entityType,
              entityId,
              details: body as object,
              ipAddress,
            },
          })
          .catch((err: Error) => {
            logger.error('Failed to write audit log', {
              action,
              entityType,
              userId: req.user?.id,
              error: err.message,
            })
          })
      }

      return originalJson(body)
    }

    next()
  }
}
