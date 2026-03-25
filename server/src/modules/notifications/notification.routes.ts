import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { getNotificationsQuerySchema } from './notification.validation'
import * as controller from './notification.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// GET /notifications
router.get(
  '/',
  validate(getNotificationsQuerySchema, 'query'),
  controller.getNotifications,
)

// GET /notifications/unread-count
router.get('/unread-count', controller.getUnreadCount)

// PATCH /notifications/read-all  (must be before /:id/read to avoid param capture)
router.patch('/read-all', controller.markAllAsRead)

// PATCH /notifications/:id/read
router.patch('/:id/read', controller.markAsRead)

export default router
