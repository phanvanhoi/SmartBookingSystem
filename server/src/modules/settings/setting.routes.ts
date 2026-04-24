import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  updateSettingsSchema,
  pricingRuleSchema,
  surchargeSchema,
  voucherSchema,
} from './setting.validation'
import {
  getSettingsHandler,
  updateSettingsHandler,
  uploadQRHandler,
  getPricingRulesHandler,
  createPricingRuleHandler,
  updatePricingRuleHandler,
  deletePricingRuleHandler,
  getSurchargesHandler,
  createSurchargeHandler,
  updateSurchargeHandler,
  deleteSurchargeHandler,
  getVouchersHandler,
  createVoucherHandler,
  updateVoucherHandler,
  deleteVoucherHandler,
} from './setting.controller'

// ── Multer config for QR upload ───────────────────────────────────────────────

const qrUploadDir = path.join(__dirname, '../../../../uploads/qr')

// Ensure upload directory exists
if (!fs.existsSync(qrUploadDir)) {
  fs.mkdirSync(qrUploadDir, { recursive: true })
}

const qrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, qrUploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const timestamp = Date.now()
    cb(null, `qr_${timestamp}${ext}`)
  },
})

const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp']
const ALLOWED_IMAGE_MIME = ['image/jpeg', '.image/jpg', 'image/png', 'image/webp'].map((m) =>
  m.replace(/^\./, ''),
)

const qrUpload = multer({
  storage: qrStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  // Validate BOTH extension and mimetype — extension alone can be spoofed
  // by renaming an .exe to .png. Multer reads mimetype from the upload header,
  // so this catches the obvious cases without sniffing magic bytes.
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const mime = file.mimetype.toLowerCase()
    if (!ALLOWED_IMAGE_EXT.includes(ext)) {
      cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)'))
      return
    }
    if (!mime.startsWith('image/') || !ALLOWED_IMAGE_MIME.includes(mime)) {
      cb(new Error('File không phải ảnh hợp lệ'))
      return
    }
    cb(null, true)
  },
})

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router()

// GET    /api/v1/settings
router.get('/', authenticate, authorize('OWNER'), getSettingsHandler)

// PUT    /api/v1/settings
router.put('/', authenticate, authorize('OWNER'), validate(updateSettingsSchema), updateSettingsHandler)

// POST   /api/v1/settings/qr-upload
router.post(
  '/qr-upload',
  authenticate,
  authorize('OWNER'),
  qrUpload.single('image'),
  uploadQRHandler
)

// GET    /api/v1/settings/pricing
router.get('/pricing', authenticate, authorize('OWNER'), getPricingRulesHandler)

// POST   /api/v1/settings/pricing
router.post(
  '/pricing',
  authenticate,
  authorize('OWNER'),
  validate(pricingRuleSchema),
  createPricingRuleHandler
)

// PUT    /api/v1/settings/pricing/:id
router.put(
  '/pricing/:id',
  authenticate,
  authorize('OWNER'),
  validate(pricingRuleSchema.partial()),
  updatePricingRuleHandler
)

// DELETE /api/v1/settings/pricing/:id
router.delete('/pricing/:id', authenticate, authorize('OWNER'), deletePricingRuleHandler)

// GET    /api/v1/settings/surcharges
router.get('/surcharges', authenticate, authorize('OWNER'), getSurchargesHandler)

// POST   /api/v1/settings/surcharges
router.post(
  '/surcharges',
  authenticate,
  authorize('OWNER'),
  validate(surchargeSchema),
  createSurchargeHandler
)

// PUT    /api/v1/settings/surcharges/:id
router.put(
  '/surcharges/:id',
  authenticate,
  authorize('OWNER'),
  validate(surchargeSchema.partial()),
  updateSurchargeHandler
)

// DELETE /api/v1/settings/surcharges/:id
router.delete('/surcharges/:id', authenticate, authorize('OWNER'), deleteSurchargeHandler)

// GET    /api/v1/settings/vouchers
router.get('/vouchers', authenticate, authorize('OWNER'), getVouchersHandler)

// POST   /api/v1/settings/vouchers
router.post(
  '/vouchers',
  authenticate,
  authorize('OWNER'),
  validate(voucherSchema),
  createVoucherHandler
)

// PUT    /api/v1/settings/vouchers/:id
router.put(
  '/vouchers/:id',
  authenticate,
  authorize('OWNER'),
  validate(voucherSchema.partial()),
  updateVoucherHandler
)

// DELETE /api/v1/settings/vouchers/:id
router.delete('/vouchers/:id', authenticate, authorize('OWNER'), deleteVoucherHandler)

export default router
