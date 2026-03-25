import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../../types'
import * as reportService from './report.service'
import type { RevenueQueryInput, DateRangeQueryInput, ExportQueryInput } from './report.validation'

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = await reportService.getDashboardData()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Revenue Report ───────────────────────────────────────────────────────────

export async function getRevenueReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const filters = req.query as unknown as RevenueQueryInput
    const data = await reportService.getRevenueReport(filters)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Room Report ──────────────────────────────────────────────────────────────

export async function getRoomReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const filters = req.query as unknown as DateRangeQueryInput
    const data = await reportService.getRoomReport(filters)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Peak Hours Report ────────────────────────────────────────────────────────

export async function getPeakHoursReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const filters = req.query as unknown as DateRangeQueryInput
    const data = await reportService.getPeakHoursReport(filters)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Stock Report ─────────────────────────────────────────────────────────────

export async function getStockReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const filters = req.query as unknown as DateRangeQueryInput
    const data = await reportService.getStockReport(filters)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Shift Report ─────────────────────────────────────────────────────────────

export async function getShiftReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const filters = req.query as unknown as DateRangeQueryInput
    const data = await reportService.getShiftReport(filters)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// ── Export Report ────────────────────────────────────────────────────────────

export async function exportReport(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { type, format: fmt, dateFrom, dateTo } = req.query as unknown as ExportQueryInput

    let data: unknown
    const filters: DateRangeQueryInput = { period: 'custom', dateFrom, dateTo }

    switch (type) {
      case 'revenue':
        data = await reportService.getRevenueReport(filters)
        break
      case 'rooms':
        data = await reportService.getRoomReport(filters)
        break
      case 'stock':
        data = await reportService.getStockReport(filters)
        break
      case 'shifts':
        data = await reportService.getShiftReport(filters)
        break
      default:
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_EXPORT_TYPE', message: 'Loại báo cáo không hợp lệ' },
        })
        return
    }

    // For now, return JSON response regardless of format
    res.json({
      success: true,
      data: {
        type,
        format: fmt,
        exportedAt: new Date().toISOString(),
        report: data,
      },
      message: `Xuất báo cáo ${type} thành công`,
    })
  } catch (err) {
    next(err)
  }
}
