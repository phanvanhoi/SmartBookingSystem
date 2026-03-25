import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { authorize } from '../../middleware/role.middleware'
import { validate } from '../../middleware/validate.middleware'
import { updateRoomSchema, maintenanceSchema } from './room.validation'
import {
  getAllRooms,
  getRoomById,
  updateRoom,
  setMaintenance,
} from './room.controller'

const router = Router()

// GET /api/v1/rooms — danh sách phòng + trạng thái realtime
router.get('/', authenticate, getAllRooms)

// GET /api/v1/rooms/:id — chi tiết phòng
router.get('/:id', authenticate, getRoomById)

// PUT /api/v1/rooms/:id — cập nhật phòng (OWNER)
router.put('/:id', authenticate, authorize('OWNER'), validate(updateRoomSchema), updateRoom)

// PATCH /api/v1/rooms/:id/maintenance — bật/tắt bảo trì (MANAGER+)
router.patch(
  '/:id/maintenance',
  authenticate,
  authorize('MANAGER'),
  validate(maintenanceSchema),
  setMaintenance,
)

export default router
