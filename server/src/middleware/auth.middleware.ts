import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthUser } from '../types/index'
import { signToken, getJwtRefreshThresholdMs } from '../modules/auth/auth.service'
import { prisma } from '../lib/prisma'
import logger from '../utils/logger'

interface JwtTokenPayload {
  sub: number
  username: string
  role: AuthUser['role']
  fullName: string
  iat?: number
  exp?: number
}

// Sliding session: re-issue a token (qua header X-New-Token) khi token hiện
// tại sắp hết hạn (nửa cuối vòng đời, tối đa 7 ngày). User còn hoạt động thì
// session được gia hạn liên tục.
const REFRESH_THRESHOLD_MS = getJwtRefreshThresholdMs()

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

  let decoded: JwtTokenPayload
  try {
    decoded = jwt.verify(token, secret) as unknown as JwtTokenPayload
  } catch {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Token không hợp lệ hoặc đã hết hạn',
      },
    })
    return
  }

  req.user = {
    id: decoded.sub,
    username: decoded.username,
    role: decoded.role,
    fullName: decoded.fullName,
  }

  // Sliding refresh — chỉ chạy khi token sắp hết hạn. Re-fetch user từ DB
  // để role / fullName / isActive luôn phản ánh trạng thái hiện tại
  // (otherwise a demoted/disabled user keeps access cho đến full window).
  if (decoded.exp && decoded.exp * 1000 - Date.now() < REFRESH_THRESHOLD_MS) {
    try {
      const fresh = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, username: true, fullName: true, role: true, isActive: true },
      })
      if (!fresh || !fresh.isActive) {
        res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Tài khoản đã bị vô hiệu hóa',
          },
        })
        return
      }
      const newToken = signToken({
        sub: fresh.id,
        username: fresh.username,
        role: fresh.role as AuthUser['role'],
        fullName: fresh.fullName,
      })
      res.setHeader('X-New-Token', newToken)
      // Cập nhật req.user theo DB để handler đời sau thấy role mới ngay
      // trong cùng request đầu tiên sau khi refresh.
      req.user = {
        id: fresh.id,
        username: fresh.username,
        role: fresh.role as AuthUser['role'],
        fullName: fresh.fullName,
      }
    } catch (err) {
      // DB lỗi → bỏ qua refresh, để request đi tiếp với token cũ. Lần sau
      // gọi lại sẽ thử refresh tiếp.
      logger.error('[auth] sliding refresh failed', { err, userId: decoded.sub })
    }
  }

  next()
}
