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

// Resolve from cwd (set by Docker WORKDIR=/app or by dev script in server/)
// so the path is the same regardless of dist/ depth in compiled output.
// Override with UPLOAD_DIR env if needed.
const uploadRoot = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads')
const qrUploadDir = path.join(uploadRoot, 'qr')

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

// Explicit allow-list — do NOT use `mime.startsWith('image/')`, that would
// admit `image/svg+xml` (which can carry inline JS) and other non-raster
// types. Magic-byte sniffing would be stronger but multer doesn't do it OOB.
const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const qrUpload = multer({
  storage: qrStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  // Validate BOTH extension and mimetype — extension can be spoofed by renaming,
  // mimetype comes from the upload header (also spoofable, but together they
  // catch the casual case).
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const mime = file.mimetype.toLowerCase()
    if (!ALLOWED_IMAGE_EXT.has(ext)) {
      cb(new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)'))
      return
    }
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      cb(new Error('File không phải ảnh hợp lệ (chỉ JPG/PNG/WebP, không nhận SVG)'))
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
