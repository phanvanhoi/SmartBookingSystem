import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthUser } from '../types/index'

interface JwtTokenPayload {
  sub: number
  username: string
  role: AuthUser['role']
  fullName: string
  iat?: number
  exp?: number
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để tiếp tục',
      },
    })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Cấu hình server không hợp lệ',
      },
    })
    return
  }

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtTokenPayload

    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      fullName: decoded.fullName,
    }

    next()
  } catch {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Token không hợp lệ hoặc đã hết hạn',
      },
    })
  }
}
