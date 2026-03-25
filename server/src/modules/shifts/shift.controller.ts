import { Request, Response, NextFunction } from 'express'
import * as shiftService from './shift.service'
import type { OpenShiftInput, CloseShiftInput } from './shift.validation'

// ────────────────────────────────────────────────────────────────────────────
// POST /shifts/open
// ────────────────────────────────────────────────────────────────────────────

export async function openShiftHandler(
  req: Request<object, object, OpenShiftInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const shift = await shiftService.openShift(userId, req.body)

    res.status(201).json({
      success: true,
      data: shift,
      message: 'Mở ca làm việc thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /shifts/:shiftId/close
// ────────────────────────────────────────────────────────────────────────────

export async function closeShiftHandler(
  req: Request<{ shiftId: string }, object, CloseShiftInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const shiftId = parseInt(req.params.shiftId, 10)
    if (isNaN(shiftId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID ca không hợp lệ' },
      })
      return
    }

    const userId = req.user!.id
    const result = await shiftService.closeShift(shiftId, userId, req.body)

    res.status(200).json({
      success: true,
      data: result,
      message: 'Đóng ca làm việc thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /shifts/current
// ────────────────────────────────────────────────────────────────────────────

export async function getCurrentShiftHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const shift = await shiftService.getCurrentShift()

    res.status(200).json({
      success: true,
      data: shift,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /shifts
// ────────────────────────────────────────────────────────────────────────────

export async function getShiftsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query as unknown as {
      dateFrom?: string
      dateTo?: string
      page: number
      limit: number
    }

    const result = await shiftService.getShifts(query)

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}
