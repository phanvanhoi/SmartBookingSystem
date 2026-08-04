import { Request, Response, NextFunction } from 'express'
import type { ApiResponse } from '../../types'
import * as publicService from './public.service'
import type { PublicBookingInput, PublicSpinInput, UpdateSpinPrizeInput } from './public.validation'

export async function listRoomsHandler(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const rooms = await publicService.listPublicRooms()
    res.json({ success: true, data: rooms })
  } catch (err) {
    next(err)
  }
}

export async function createBookingHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const data = req.body as PublicBookingInput
    const result = await publicService.createPublicBooking(data)
    res.status(201).json({
      success: true,
      data: result,
      message: 'Đặt lịch thành công! Giữ mã quay thưởng của bạn.',
    })
  } catch (err) {
    next(err)
  }
}

export async function getCampaignHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const roomIdRaw = req.query.roomId
    const tokenRaw = req.query.token
    const roomId =
      typeof roomIdRaw === 'string' && roomIdRaw.trim()
        ? Number(roomIdRaw)
        : undefined
    const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : undefined

    if (roomId !== undefined && (!Number.isInteger(roomId) || roomId <= 0)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ROOM_ID', message: 'roomId không hợp lệ' },
      })
      return
    }

    const campaign = await publicService.getPublicCampaign({ roomId, token })
    res.json({ success: true, data: campaign })
  } catch (err) {
    next(err)
  }
}

export async function getTokenHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const token = String(req.params.token ?? '')
    const status = await publicService.getTokenStatus(token)
    res.json({ success: true, data: status })
  } catch (err) {
    next(err)
  }
}

export async function spinHandler(req: Request, res: Response<ApiResponse>, next: NextFunction) {
  try {
    const { token } = req.body as PublicSpinInput
    const result = await publicService.spinWithToken(token)
    res.json({
      success: true,
      data: result,
      message: result.prize.prizeType === 'NO_PRIZE' ? 'Chúc may mắn lần sau!' : 'Chúc mừng bạn!',
    })
  } catch (err) {
    next(err)
  }
}

export async function adminCampaignHandler(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const campaign = await publicService.getAdminCampaign()
    res.json({ success: true, data: campaign })
  } catch (err) {
    next(err)
  }
}

export async function updatePrizeHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'ID không hợp lệ' },
      })
      return
    }
    const prize = await publicService.updateSpinPrize(id, req.body as UpdateSpinPrizeInput)
    res.json({ success: true, data: prize, message: 'Cập nhật phần thưởng thành công' })
  } catch (err) {
    next(err)
  }
}

export async function recentSpinsHandler(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30
    const spins = await publicService.listRecentSpins(limit)
    res.json({ success: true, data: spins })
  } catch (err) {
    next(err)
  }
}
