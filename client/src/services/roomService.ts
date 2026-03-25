import api from '@/services/api'
import type { Room, CheckinForm, CheckoutData } from '@/types/room'

export const roomService = {
  getRooms(): Promise<Room[]> {
    return api.get('/rooms').then((res) => res.data.data)
  },

  getRoomById(id: number): Promise<Room> {
    return api.get(`/rooms/${id}`).then((res) => res.data.data)
  },

  checkin(data: CheckinForm): Promise<{
    sessionId: number
    roomId: number
    roomName: string
    customerName: string
    checkInTime: string
    estimatedEnd?: string
  }> {
    return api.post('/sessions/checkin', data).then((res) => res.data.data)
  },

  checkout(sessionId: number): Promise<CheckoutData> {
    return api.post(`/sessions/${sessionId}/checkout`).then((res) => res.data.data)
  },

  extendSession(
    sessionId: number,
    additionalMinutes: number
  ): Promise<{
    sessionId: number
    newEstimatedEnd: string
    hasConflict: boolean
  }> {
    return api
      .patch(`/sessions/${sessionId}/extend`, { additionalMinutes })
      .then((res) => res.data.data)
  },

  transferSession(
    sessionId: number,
    targetRoomId: number
  ): Promise<{
    sessionId: number
    fromRoom: { id: number; name: string; type: string }
    toRoom: { id: number; name: string; type: string }
    priceNote: string
  }> {
    return api
      .post(`/sessions/${sessionId}/transfer`, { targetRoomId })
      .then((res) => res.data.data)
  },

  mergeSessions(
    primarySessionId: number,
    secondarySessionId: number,
  ): Promise<{ message: string }> {
    return api
      .post('/sessions/merge', { primarySessionId, secondarySessionId })
      .then((res) => res.data.data)
  },

  lookupCustomer(phone: string): Promise<{
    id: number
    name: string
    tier: string
    totalVisits: number
    lastVisit?: string
  } | null> {
    return api
      .get(`/customers/lookup`, { params: { phone } })
      .then((res) => res.data.data)
      .catch(() => null)
  },
}
