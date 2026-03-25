import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../../types'
import type { CheckoutInput, InvoiceQueryInput } from './checkout.validation'
import * as checkoutService from './checkout.service'

// ─── Helper: parse number param ───────────────────────────────────────────────
function parseParam(value: string | string[] | undefined): number {
  const str = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  return parseInt(str, 10)
}

// ─── processCheckoutHandler ──────────────────────────────────────────────────

export async function processCheckoutHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CheckoutInput
    const userId = req.user!.id
    const invoice = await checkoutService.processCheckout(data, userId)

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Thanh toán thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ─── getQRHandler ─────────────────────────────────────────────────────────────

export async function getQRHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await checkoutService.getQRCode()
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

// ─── getInvoicesHandler ───────────────────────────────────────────────────────

export async function getInvoicesHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as InvoiceQueryInput
    const result = await checkoutService.getInvoices({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      search: query.search,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ─── getInvoiceByIdHandler ────────────────────────────────────────────────────

export async function getInvoiceByIdHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseParam(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_PARAM', message: 'ID hóa đơn không hợp lệ' },
      })
      return
    }

    const invoice = await checkoutService.getInvoiceById(id)
    res.json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}
