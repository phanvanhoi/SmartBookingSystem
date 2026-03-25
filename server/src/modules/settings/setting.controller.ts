import { Request, Response, NextFunction } from 'express'
import * as settingService from './setting.service'
import type { UpdateSettingsInput, PricingRuleInput, SurchargeInput, VoucherInput } from './setting.validation'

// ────────────────────────────────────────────────────────────────────────────
// GET /settings
// ────────────────────────────────────────────────────────────────────────────

export async function getSettingsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await settingService.getSettings()

    res.status(200).json({
      success: true,
      data: settings,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /settings
// ────────────────────────────────────────────────────────────────────────────

export async function updateSettingsHandler(
  req: Request<object, object, UpdateSettingsInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id
    const settings = await settingService.updateSettings(req.body, userId)

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Cập nhật cài đặt thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /settings/qr-upload
// ────────────────────────────────────────────────────────────────────────────

export async function uploadQRHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'Vui lòng chọn file ảnh' },
      })
      return
    }

    const qrType = req.body.qrType as 'QR1' | 'QR2'
    if (!qrType || !['QR1', 'QR2'].includes(qrType)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QR_TYPE', message: 'qrType phải là QR1 hoặc QR2' },
      })
      return
    }

    const filePath = `/uploads/qr/${req.file.filename}`
    const userId = req.user!.id

    const setting = await settingService.uploadQR(qrType, filePath, userId)

    res.status(200).json({
      success: true,
      data: setting,
      message: `Upload QR ${qrType} thành công`,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /settings/pricing
// ────────────────────────────────────────────────────────────────────────────

export async function getPricingRulesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rules = await settingService.getPricingRules()

    res.status(200).json({
      success: true,
      data: rules,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /settings/pricing
// ────────────────────────────────────────────────────────────────────────────

export async function createPricingRuleHandler(
  req: Request<object, object, PricingRuleInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rule = await settingService.createPricingRule(req.body)

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Tạo khung giờ thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /settings/pricing/:id
// ────────────────────────────────────────────────────────────────────────────

export async function updatePricingRuleHandler(
  req: Request<{ id: string }, object, Partial<PricingRuleInput>>,
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

    const rule = await settingService.updatePricingRule(id, req.body)

    res.status(200).json({
      success: true,
      data: rule,
      message: 'Cập nhật khung giờ thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /settings/pricing/:id
// ────────────────────────────────────────────────────────────────────────────

export async function deletePricingRuleHandler(
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

    await settingService.deletePricingRule(id)

    res.status(200).json({
      success: true,
      message: 'Xóa khung giờ thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /settings/surcharges
// ────────────────────────────────────────────────────────────────────────────

export async function getSurchargesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const surcharges = await settingService.getSurcharges()

    res.status(200).json({
      success: true,
      data: surcharges,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /settings/surcharges
// ────────────────────────────────────────────────────────────────────────────

export async function createSurchargeHandler(
  req: Request<object, object, SurchargeInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const surcharge = await settingService.createSurcharge(req.body)

    res.status(201).json({
      success: true,
      data: surcharge,
      message: 'Tạo phụ thu thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /settings/surcharges/:id
// ────────────────────────────────────────────────────────────────────────────

export async function updateSurchargeHandler(
  req: Request<{ id: string }, object, Partial<SurchargeInput>>,
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

    const surcharge = await settingService.updateSurcharge(id, req.body)

    res.status(200).json({
      success: true,
      data: surcharge,
      message: 'Cập nhật phụ thu thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /settings/surcharges/:id
// ────────────────────────────────────────────────────────────────────────────

export async function deleteSurchargeHandler(
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

    await settingService.deleteSurcharge(id)

    res.status(200).json({
      success: true,
      message: 'Xóa phụ thu thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /settings/vouchers
// ────────────────────────────────────────────────────────────────────────────

export async function getVouchersHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const vouchers = await settingService.getVouchers()

    res.status(200).json({
      success: true,
      data: vouchers,
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /settings/vouchers
// ────────────────────────────────────────────────────────────────────────────

export async function createVoucherHandler(
  req: Request<object, object, VoucherInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const voucher = await settingService.createVoucher(req.body)

    res.status(201).json({
      success: true,
      data: voucher,
      message: 'Tạo voucher thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /settings/vouchers/:id
// ────────────────────────────────────────────────────────────────────────────

export async function updateVoucherHandler(
  req: Request<{ id: string }, object, Partial<VoucherInput>>,
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

    const voucher = await settingService.updateVoucher(id, req.body)

    res.status(200).json({
      success: true,
      data: voucher,
      message: 'Cập nhật voucher thành công',
    })
  } catch (err) {
    next(err)
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /settings/vouchers/:id
// ────────────────────────────────────────────────────────────────────────────

export async function deleteVoucherHandler(
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

    await settingService.deleteVoucher(id)

    res.status(200).json({
      success: true,
      message: 'Xóa voucher thành công',
    })
  } catch (err) {
    next(err)
  }
}
