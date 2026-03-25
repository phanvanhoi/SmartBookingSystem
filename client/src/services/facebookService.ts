import api from './api'

export interface FacebookSettings {
  pageToken: string
  verifyToken: string
  pageId: string
  enabled: boolean
}

export interface ParsedBooking {
  customerName: string | null
  customerPhone: string | null
  date: string | null
  time: string | null
  durationHours: number | null
  roomPreference: 'small' | 'large' | null
  guestCount: number | null
  confidence: number
  raw: string
}

export interface FacebookMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  parsed: ParsedBooking | null
  autoBookingId: number | null
  status: 'new' | 'parsed' | 'booked' | 'ignored'
}

export const facebookService = {
  getSettings: () => api.get('/facebook/settings').then(r => r.data.data as FacebookSettings),
  updateSettings: (data: Partial<FacebookSettings>) => api.put('/facebook/settings', data).then(r => r.data),
  getMessages: (limit = 50) => api.get('/facebook/messages', { params: { limit } }).then(r => r.data.data as FacebookMessage[]),
  ignoreMessage: (id: string) => api.patch(`/facebook/messages/${id}/ignore`).then(r => r.data),
  confirmMessage: (id: string, data: {
    roomId: number; customerName: string; customerPhone?: string
    date: string; time: string; durationHours?: number
  }) => api.post(`/facebook/messages/${id}/confirm`, data).then(r => r.data),
  testParse: (text: string) => api.post('/facebook/test-parse', { text }).then(r => r.data.data as ParsedBooking),
}
