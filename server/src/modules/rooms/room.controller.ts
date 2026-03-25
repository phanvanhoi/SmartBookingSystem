import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../../types'
import type {
  CheckinInput,
  ExtendInput,
  TransferInput,
  MergeInput,
  BookingInput,
  WaitingQueueInput,
  MaintenanceInput,
  UpdateRoomInput,
  CancelBookingInput,
  SessionQueryInput,
  BookingQueryInput,
  QueueQueryInput,
} from './room.validation'
import * as roomService from './room.service'
import * as sessionService from './session.service'
import * as bookingService from './booking.service'
import * as queueService from './queue.service'

// ─── Helper: safely parse route params (Express params can be string | string[]) ─
function parseParam(value: string | string[] | undefined): number {
  const str = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  return parseInt(str, 10)
}

// ════════════════════════════════════════════════════════════════════════════
// ROOM CONTROLLERS
// ════════════════════════════════════════════════════════════════════════════

export async function getAllRooms(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const rawStatus = req.query.status as string | string[] | undefined
    const status: string | undefined = Array.isArray(rawStatus)
      ? rawStatus[0]
      : rawStatus
    const rooms = await roomService.getAllRooms(status)
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}

export async function getRoomById(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const id = parseParam(req.params.id)
    const room = await roomService.getRoomById(id)
    if (!room) {
      res.status(404).json({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Phòng không tồn tại' },
      })
      return
    }
    res.json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

export async function updateRoom(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const id = parseParam(req.params.id)
    const data = req.body as UpdateRoomInput
    const room = await roomService.updateRoom(id, data)
    res.json({ success: true, data: room, message: 'Cập nhật phòng thành công' })
  } catch (err) {
    next(err)
  }
}

export async function setMaintenance(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const id = parseParam(req.params.id)
    const { maintenance, reason } = req.body as MaintenanceInput
    const room = await roomService.setMaintenance(id, maintenance, reason)
    res.json({
      success: true,
      data: room,
      message: maintenance ? 'Đã đặt phòng vào chế độ bảo trì' : 'Đã mở lại phòng',
    })
  } catch (err) {
    next(err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SESSION CONTROLLERS
// ════════════════════════════════════════════════════════════════════════════

export async function checkin(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as CheckinInput
    const userId = req.user!.id
    const result = await sessionService.checkin(data, userId)
    res.status(201).json({
      success: true,
      data: result,
      message: 'Check-in phòng thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function checkout(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const sessionId = parseParam(req.params.sessionId)
    const userId = req.user!.id
    const result = await sessionService.checkout(sessionId, userId)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function extendSession(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const sessionId = parseParam(req.params.sessionId)
    const data = req.body as ExtendInput
    const result = await sessionService.extendSession(sessionId, data)
    res.json({
      success: true,
      data: result,
      message: `Gia hạn thêm ${data.additionalMinutes} phút thành công`,
    })
  } catch (err) {
    next(err)
  }
}

export async function transferSession(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const sessionId = parseParam(req.params.sessionId)
    const data = req.body as TransferInput
    const userId = req.user!.id
    const result = await sessionService.transferSession(sessionId, data, userId)
    res.json({
      success: true,
      data: result,
      message: 'Chuyển phòng thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function mergeSessions(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const data = req.body as MergeInput
    const userId = req.user!.id
    const result = await sessionService.mergeSessions(data, userId)
    res.json({ success: true, data: result, message: result.message })
  } catch (err) {
    next(err)
  }
}

export async function getSessions(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const query = req.query as unknown as SessionQueryInput
    const result = await sessionService.getSessions({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      roomId: query.roomId,
      status: query.status,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
    })
    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// BOOKING CONTROLLERS
// ════════════════════════════════════════════════════════════════════════════

export async function createBooking(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const data = req.body as BookingInput
    const userId = req.user!.id
    const booking = await bookingService.createBooking(data, userId)
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Đặt phòng thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function getBookings(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const query = req.query as unknown as BookingQueryInput
    const result = await bookingService.getBookings(query)
    res.json({
      success: true,
      data: result.bookings,
      pagination: result.pagination,
    })
  } catch (err) {
    next(err)
  }
}

export async function confirmBooking(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const bookingId = parseParam(req.params.bookingId)
    const userId = req.user!.id
    const result = await bookingService.confirmBooking(bookingId, userId)
    res.json({
      success: true,
      data: result,
      message: 'Xác nhận booking và check-in thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function cancelBooking(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const bookingId = parseParam(req.params.bookingId)
    const { reason } = req.body as CancelBookingInput
    const booking = await bookingService.cancelBooking(bookingId, reason)
    res.json({ success: true, data: booking, message: 'Hủy booking thành công' })
  } catch (err) {
    next(err)
  }
}

export async function updateBooking(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const bookingId = parseParam(req.params.bookingId)
    const { roomId, bookingTime, durationHours } = req.body
    const booking = await bookingService.updateBooking(bookingId, { roomId, bookingTime, durationHours })
    res.json({ success: true, data: booking, message: 'Cập nhật booking thành công' })
  } catch (err) {
    next(err)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// QUEUE CONTROLLERS
// ════════════════════════════════════════════════════════════════════════════

export async function addToQueue(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const data = req.body as WaitingQueueInput
    const userId = req.user!.id
    const entry = await queueService.addToQueue(data, userId)
    res.status(201).json({
      success: true,
      data: entry,
      message: 'Thêm vào hàng chờ thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function getQueue(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const query = req.query as unknown as QueueQueryInput
    const entries = await queueService.getQueue(query.status)
    res.json({ success: true, data: entries })
  } catch (err) {
    next(err)
  }
}

export async function assignRoom(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const queueId = parseParam(req.params.id)
    const { roomId } = req.body as { roomId: number }
    const userId = req.user!.id
    const result = await queueService.assignRoom(queueId, roomId, userId)
    res.json({
      success: true,
      data: result,
      message: 'Xếp phòng thành công',
    })
  } catch (err) {
    next(err)
  }
}

export async function cancelQueue(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const queueId = parseParam(req.params.id)
    const entry = await queueService.cancelQueue(queueId)
    res.json({ success: true, data: entry, message: 'Hủy hàng chờ thành công' })
  } catch (err) {
    next(err)
  }
}
