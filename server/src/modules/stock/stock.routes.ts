import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import {
  productSchema,
  updateProductSchema,
  stockEntrySchema,
  inventoryCheckSchema,
  supplierSchema,
  updateSupplierSchema,
  productQuerySchema,
  stockEntryQuerySchema,
} from './stock.validation'
import {
  getProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
  createStockEntryHandler,
  getStockEntriesHandler,
  inventoryCheckHandler,
  getLowStockAlertsHandler,
  getSuppliersHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
} from './stock.controller'

const router = Router()

// ── Products ──────────────────────────────────────────────
// GET  /api/v1/stock/products
router.get(
  '/products',
  authenticate,
  validate(productQuerySchema, 'query'),
  getProductsHandler
)

// POST /api/v1/stock/products
router.post(
  '/products',
  authenticate,
  authorize('OWNER'),
  validate(productSchema),
  createProductHandler
)

// PUT /api/v1/stock/products/:id
router.put(
  '/products/:id',
  authenticate,
  authorize('OWNER'),
  validate(updateProductSchema),
  updateProductHandler
)

// DELETE /api/v1/stock/products/:id
router.delete(
  '/products/:id',
  authenticate,
  authorize('OWNER'),
  deleteProductHandler
)

// ── Stock Entries ─────────────────────────────────────────
// POST /api/v1/stock/entries
router.post(
  '/entries',
  authenticate,
  authorize('MANAGER'),
  validate(stockEntrySchema),
  createStockEntryHandler
)

// GET /api/v1/stock/entries
router.get(
  '/entries',
  authenticate,
  validate(stockEntryQuerySchema, 'query'),
  getStockEntriesHandler
)

// ── Inventory Check ───────────────────────────────────────
// POST /api/v1/stock/inventory-check
router.post(
  '/inventory-check',
  authenticate,
  authorize('MANAGER'),
  validate(inventoryCheckSchema),
  inventoryCheckHandler
)

// ── Low Stock Alerts ──────────────────────────────────────
// GET /api/v1/stock/alerts
router.get(
  '/alerts',
  authenticate,
  getLowStockAlertsHandler
)

// ── Suppliers ─────────────────────────────────────────────
// GET /api/v1/stock/suppliers
router.get(
  '/suppliers',
  authenticate,
  getSuppliersHandler
)

// POST /api/v1/stock/suppliers
router.post(
  '/suppliers',
  authenticate,
  authorize('OWNER'),
  validate(supplierSchema),
  createSupplierHandler
)

// PUT /api/v1/stock/suppliers/:id
router.put(
  '/suppliers/:id',
  authenticate,
  authorize('OWNER'),
  validate(updateSupplierSchema),
  updateSupplierHandler
)

// DELETE /api/v1/stock/suppliers/:id
router.delete(
  '/suppliers/:id',
  authenticate,
  authorize('OWNER'),
  deleteSupplierHandler
)

export default router
