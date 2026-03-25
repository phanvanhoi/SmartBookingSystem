import { Request, Response, NextFunction } from 'express'
import * as customerService from './customer.service'
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  BlacklistInput,
  RedeemPointsInput,
} from './customer.validation'

// ────────────────────────────────────────────────────────────────────────────
// GET /customers
// ────────────────────────────────────────────────────────────────────────────

export async function getCustomersHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // query is already validated & coerced by validate middleware
    const query = req.query as unknown as {
      search?: string
      tier?: 'REGULAR' | 'SILVER' | 'GOLD' | 'VIP'
      page: number
      limit: number
    }

    const result = await customerService.getCustomers(query)

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /customers/lookup?phone=...
// ────────────────────────────────────────────────────────────────────────────

export async function lookupByPhoneHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const phone = req.query['phone'] as string
    const customer = await customerService.lookupByPhone(phone)

    if (!customer) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'Không tìm thấy khách hàng với số điện thoại này',
      })
      return
    }

    res.status(200).json({
      success: true,
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /customers/birthdays
// ────────────────────────────────────────────────────────────────────────────

export async function getBirthdayCustomersHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customers = await customerService.getBirthdayCustomers()

    res.status(200).json({
      success: true,
      data: customers,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /customers/:id
// ────────────────────────────────────────────────────────────────────────────

export async function getCustomerByIdHandler(
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

    const customer = await customerService.getCustomerById(id)

    res.status(200).json({
      success: true,
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /customers/:id/history
// ────────────────────────────────────────────────────────────────────────────

export async function getCustomerHistoryHandler(
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

    // query coerced by validate middleware
    const { page = 1, limit = 20 } = req.query as unknown as { page: number; limit: number }
    const result = await customerService.getCustomerHistory(id, Number(page), Number(limit))

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /customers/:id/points
// ────────────────────────────────────────────────────────────────────────────

export async function getCustomerPointsHandler(
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

    // query coerced by validate middleware
    const { page = 1, limit = 20 } = req.query as unknown as { page: number; limit: number }
    const result = await customerService.getCustomerPoints(id, Number(page), Number(limit))

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /customers
// ────────────────────────────────────────────────────────────────────────────

export async function createCustomerHandler(
  req: Request<object, object, CreateCustomerInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customer = await customerService.createCustomer(req.body)

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Tạo khách hàng thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /customers/:id
// ────────────────────────────────────────────────────────────────────────────

export async function updateCustomerHandler(
  req: Request<{ id: string }, object, UpdateCustomerInput>,
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

    const customer = await customerService.updateCustomer(id, req.body)

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Cập nhật khách hàng thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /customers/:id/blacklist
// ────────────────────────────────────────────────────────────────────────────

export async function toggleBlacklistHandler(
  req: Request<{ id: string }, object, BlacklistInput>,
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

    const { isBlacklisted, blacklistReason } = req.body
    const customer = await customerService.toggleBlacklist(id, isBlacklisted, blacklistReason)

    const message = isBlacklisted
      ? 'Đã thêm khách hàng vào danh sách đen'
      : 'Đã xoá khách hàng khỏi danh sách đen'

    res.status(200).json({
      success: true,
      data: customer,
      message,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /customers/:id/redeem-points
// ────────────────────────────────────────────────────────────────────────────

export async function redeemPointsHandler(
  req: Request<{ id: string }, object, RedeemPointsInput>,
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

    const { points, reason } = req.body
    const result = await customerService.redeemPoints(id, points, reason)

    res.status(200).json({
      success: true,
      data: result,
      message: `Đổi ${points} điểm thành công`,
    })
  } catch (err) {
    next(err)
  }
}
