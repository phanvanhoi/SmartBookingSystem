import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../../types'
import type {
  CheckoutInput,
  InvoiceQueryInput,
  VoidInvoiceInput,
  SettleDebtInput,
  AdjustDiscountInput,
  ChangePaymentMethodInput,
  EditTimesInput,
  AddInvoiceItemInput,
} from './checkout.validation'
import * as checkoutService from './checkout.service'
import * as invoiceEdit from './invoice-edit.service'

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

// ═══════════════════════════════════════════════════════════════════════════
// Admin invoice edit handlers
// ═══════════════════════════════════════════════════════════════════════════

function getInvoiceId(req: Request): number {
  return parseParam(req.params.id)
}

export async function voidInvoiceHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as VoidInvoiceInput
    const invoice = await invoiceEdit.voidInvoice(getInvoiceId(req), data.reason, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã hủy hóa đơn' })
  } catch (err) { next(err) }
}

export async function settleDebtHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as SettleDebtInput
    const invoice = await invoiceEdit.settleDebt(getInvoiceId(req), data, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã ghi nhận thanh toán nợ' })
  } catch (err) { next(err) }
}

export async function adjustDiscountHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as AdjustDiscountInput
    const invoice = await invoiceEdit.adjustInvoiceDiscount(getInvoiceId(req), data, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã sửa giảm giá / phụ thu' })
  } catch (err) { next(err) }
}

export async function changePaymentMethodHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as ChangePaymentMethodInput
    const paymentId = parseParam(req.params.paymentId)
    const result = await invoiceEdit.changePaymentMethod(getInvoiceId(req), paymentId, data.method, req.user!.id)
    res.json({ success: true, data: result, message: 'Đã đổi phương thức thanh toán' })
  } catch (err) { next(err) }
}

export async function editTimesHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as EditTimesInput
    const invoice = await invoiceEdit.editInvoiceTimes(getInvoiceId(req), data, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã cập nhật thời gian + tính lại tiền phòng' })
  } catch (err) { next(err) }
}

export async function addInvoiceItemHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as AddInvoiceItemInput
    const invoice = await invoiceEdit.addInvoiceItem(getInvoiceId(req), data, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã thêm món vào hóa đơn' })
  } catch (err) { next(err) }
}

export async function removeInvoiceItemHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const itemId = parseParam(req.params.itemId)
    const invoice = await invoiceEdit.removeInvoiceItem(getInvoiceId(req), itemId, req.user!.id)
    res.json({ success: true, data: invoice, message: 'Đã xóa món khỏi hóa đơn' })
  } catch (err) { next(err) }
}
