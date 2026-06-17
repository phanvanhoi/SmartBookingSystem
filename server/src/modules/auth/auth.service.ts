import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { AuthUser } from '../../types/index'
import { SALT_ROUNDS } from '../../utils/constants'

interface LoginResult {
  token: string
  user: AuthUser & { phone: string | null }
}

interface JwtPayload {
  sub: number
  username: string
  role: AuthUser['role']
  fullName: string
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError(500, 'INTERNAL_ERROR', 'JWT_SECRET chưa được cấu hình')
  }

  // Keep this default in sync with docker-compose.yml and .env.example.
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '30d'

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions)
}

/** Parse JWT_EXPIRES_IN values like 30d, 12h, 7d into milliseconds. */
export function parseJwtExpiresInMs(expiresIn = process.env.JWT_EXPIRES_IN ?? '30d'): number {
  const match = /^(\d+)([smhdw])$/i.exec(expiresIn.trim())
  if (!match) return 30 * 24 * 3600 * 1000

  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 3600 * 1000,
    d: 24 * 3600 * 1000,
    w: 7 * 24 * 3600 * 1000,
  }
  return amount * (multipliers[unit] ?? multipliers.d)
}

/** Sliding refresh window: second half of token life, capped at 7 days. */
export function getJwtRefreshThresholdMs(): number {
  const totalMs = parseJwtExpiresInMs()
  return Math.min(totalMs / 2, 7 * 24 * 3600 * 1000)
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      password: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
    },
  })

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng')
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hóa')
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng')
  }

  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role as AuthUser['role'],
    fullName: user.fullName,
  }

  const token = signToken(payload)

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as AuthUser['role'],
      phone: user.phone,
    },
  }
}

export async function getMe(userId: number): Promise<AuthUser & {
  phone: string | null
  currentShift: { id: number; startTime: Date; status: string } | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      shiftsOpened: {
        where: { status: 'OPEN' },
        orderBy: { startTime: 'desc' },
        take: 1,
        select: {
          id: true,
          startTime: true,
          status: true,
        },
      },
    },
  })

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng')
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hóa')
  }

  const currentShift = user.shiftsOpened[0] ?? null

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as AuthUser['role'],
    phone: user.phone,
    currentShift: currentShift
      ? {
          id: currentShift.id,
          startTime: currentShift.startTime,
          status: currentShift.status,
        }
      : null,
  }
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  })

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng')
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Mật khẩu hiện tại không đúng')
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  })
}
