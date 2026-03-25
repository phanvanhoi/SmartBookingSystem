import { Request, Response, NextFunction } from 'express'
import * as staffService from './staff.service'
import type { CreateStaffInput, UpdateStaffInput, ResetPasswordInput } from './staff.validation'

// ────────────────────────────────────────────────────────────────────────────
// GET /staff
// ────────────────────────────────────────────────────────────────────────────

export async function getStaffHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const staff = await staffService.getStaff()

    res.status(200).json({
      success: true,
      data: staff,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /staff
// ────────────────────────────────────────────────────────────────────────────

export async function createStaffHandler(
  req: Request<object, object, CreateStaffInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const staff = await staffService.createStaff(req.body)

    res.status(201).json({
      success: true,
      data: staff,
      message: 'Tạo nhân viên thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /staff/:id
// ────────────────────────────────────────────────────────────────────────────

export async function updateStaffHandler(
  req: Request<{ id: string }, object, UpdateStaffInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID không hợp lệ' },
      })
      return
    }

    const staff = await staffService.updateStaff(id, req.body)

    res.status(200).json({
      success: true,
      data: staff,
      message: 'Cập nhật thông tin nhân viên thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /staff/:id/reset-password
// ────────────────────────────────────────────────────────────────────────────

export async function resetPasswordHandler(
  req: Request<{ id: string }, object, ResetPasswordInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID không hợp lệ' },
      })
      return
    }

    await staffService.resetPassword(id, req.body.newPassword)

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /staff/:id/toggle-active
// ────────────────────────────────────────────────────────────────────────────

export async function toggleActiveHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID không hợp lệ' },
      })
      return
    }

    const staff = await staffService.toggleActive(id)

    const message = staff.isActive
      ? 'Đã kích hoạt tài khoản nhân viên'
      : 'Đã vô hiệu hóa tài khoản nhân viên'

    res.status(200).json({
      success: true,
      data: staff,
      message,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /staff/audit-logs
// ────────────────────────────────────────────────────────────────────────────

export async function getAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as {
      userId?: number
      action?: string
      entityType?: string
      dateFrom?: string
      dateTo?: string
      page: number
      limit: number
    }

    const result = await staffService.getAuditLogs(query)

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}
