import api from './api'

export interface Booking {
  id: number
  roomId: number
  room: { id: number; name: string }
  customerName: string
  customerPhone?: string
  bookingDate: string
  bookingTime: string
  durationHours?: number
  depositAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'
  notes?: string
  createdBy?: { id: number; fullName: string }
  createdAt: string
}

export interface CreateBookingPayload {
  roomId: number
  customerName: string
  customerPhone?: string
  bookingDate: string
  bookingTime: string
  durationHours?: number
  depositAmount?: number
  notes?: string
}

export async function getBookings(params: { date?: string; roomId?: number; status?: string }) {
  const { data } = await api.get('/bookings', { params })
  return data.data
}

export async function createBooking(payload: CreateBookingPayload) {
  const { data } = await api.post('/bookings', payload)
  return data.data
}

export async function confirmBooking(bookingId: number) {
  const { data } = await api.post(`/bookings/${bookingId}/confirm`)
  return data.data
}

export async function updateBooking(bookingId: number, payload: { roomId?: number; bookingTime?: string; durationHours?: number }) {
  const { data } = await api.patch(`/bookings/${bookingId}`, payload)
  return data.data
}

export async function cancelBooking(bookingId: number, reason?: string) {
  const { data } = await api.patch(`/bookings/${bookingId}/cancel`, { reason })
  return data.data
}
