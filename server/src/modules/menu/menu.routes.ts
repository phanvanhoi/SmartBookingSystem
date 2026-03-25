import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { categorySchema, menuItemSchema } from './menu.validation'
import {
  getMenuHandler,
  getCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  createMenuItemHandler,
  updateMenuItemHandler,
  deleteMenuItemHandler,
} from './menu.controller'

const router = Router()

// GET /api/v1/menu - Menu grouped by category (for ordering)
router.get('/', authenticate, getMenuHandler)

// GET /api/v1/menu/categories - List all categories
router.get('/categories', authenticate, getCategoriesHandler)

// POST /api/v1/menu/categories - Create category (OWNER only)
router.post(
  '/categories',
  authenticate,
  authorize('OWNER'),
  validate(categorySchema),
  createCategoryHandler
)

// PUT /api/v1/menu/categories/:id - Update category (OWNER only)
router.put(
  '/categories/:id',
  authenticate,
  authorize('OWNER'),
  validate(categorySchema),
  updateCategoryHandler
)

// DELETE /api/v1/menu/categories/:id - Soft delete category (OWNER only)
router.delete('/categories/:id', authenticate, authorize('OWNER'), deleteCategoryHandler)

// POST /api/v1/menu/items - Create menu item (OWNER only)
router.post(
  '/items',
  authenticate,
  authorize('OWNER'),
  validate(menuItemSchema),
  createMenuItemHandler
)

// PUT /api/v1/menu/items/:id - Update menu item (OWNER only)
router.put(
  '/items/:id',
  authenticate,
  authorize('OWNER'),
  validate(menuItemSchema),
  updateMenuItemHandler
)

// DELETE /api/v1/menu/items/:id - Soft delete menu item (OWNER only)
router.delete('/items/:id', authenticate, authorize('OWNER'), deleteMenuItemHandler)

export default router
