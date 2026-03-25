import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middleware/error.middleware'
import { SALT_ROUNDS } from '../../utils/constants'
import type {
  CreateStaffInput,
  UpdateStaffInput,
  GetAuditLogsQuery,
} from './staff.validation'

// ────────────────────────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────────────────────────

export interface StaffItem {
  id: number
  username: string
  fullName: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: Date
}

export interface AuditLogItem {
  id: number
  userId: number
  userFullName: string
  action: string
  entityType: string
  entityId: number
  details: unknown
  ipAddress: string | null
  createdAt: Date
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getStaff
// ────────────────────────────────────────────────────────────────────────────

export async function getStaff(): Promise<StaffItem[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })

  return users.map((u) => ({
    ...u,
    role: u.role as string,
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// createStaff
// ────────────────────────────────────────────────────────────────────────────

export async function createStaff(data: CreateStaffInput): Promise<StaffItem> {
  // Validate username unique
  const existing = await prisma.user.findUnique({ where: { username: data.username } })
  if (existing) {
    throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Tên đăng nhập đã tồn tại')
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      fullName: data.fullName,
      role: data.role,
      phone: data.phone,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })

  return {
    ...user,
    role: user.role as string,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// updateStaff
// ────────────────────────────────────────────────────────────────────────────

export async function updateStaff(id: number, data: UpdateStaffInput): Promise<StaffItem> {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'STAFF_NOT_FOUND', 'Không tìm thấy nhân viên')
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })

  return {
    ...user,
    role: user.role as string,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// resetPassword
// ────────────────────────────────────────────────────────────────────────────

export async function resetPassword(id: number, newPassword: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'STAFF_NOT_FOUND', 'Không tìm thấy nhân viên')
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  })
}

// ────────────────────────────────────────────────────────────────────────────
// toggleActive
// ────────────────────────────────────────────────────────────────────────────

export async function toggleActive(id: number): Promise<StaffItem> {
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError(404, 'STAFF_NOT_FOUND', 'Không tìm thấy nhân viên')
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })

  return {
    ...user,
    role: user.role as string,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// getAuditLogs
// ────────────────────────────────────────────────────────────────────────────

export async function getAuditLogs(
  filters: GetAuditLogsQuery
): Promise<PaginatedResult<AuditLogItem>> {
  const { userId, action, entityType, dateFrom, dateTo, page, limit } = filters
  const skip = (page - 1) * limit

  const where: {
    userId?: number
    action?: { contains: string;  }
    entityType?: { contains: string;  }
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (userId) {
    where.userId = userId
  }

  if (action) {
    where.action = { contains: action }
  }

  if (entityType) {
    where.entityType = { contains: entityType }
  }

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) {
      where.createdAt.gte = new Date(`${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      where.createdAt.lte = new Date(`${dateTo}T23:59:59`)
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    data: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userFullName: log.user.fullName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
