import api from './api'
import type { Customer, CustomerHistory, PointHistoryItem, CreateCustomerForm, CustomerTier } from '@/types/customer'

export interface GetCustomersParams {
  search?: string
  tier?: CustomerTier | ''
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SingleResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const customerService = {
  getCustomers: async (params: GetCustomersParams = {}): Promise<PaginatedResponse<Customer>> => {
    const searchParams: Record<string, string> = {}
    if (params.search) searchParams.search = params.search
    if (params.tier) searchParams.tier = params.tier
    if (params.page) searchParams.page = String(params.page)
    if (params.limit) searchParams.limit = String(params.limit)

    const query = new URLSearchParams(searchParams).toString()
    const res = await api.get<PaginatedResponse<Customer>>(`/customers${query ? `?${query}` : ''}`)
    return res.data
  },

  lookupByPhone: async (phone: string): Promise<SingleResponse<Customer>> => {
    const res = await api.get<SingleResponse<Customer>>(`/customers/lookup?phone=${encodeURIComponent(phone)}`)
    return res.data
  },

  getCustomerById: async (id: number): Promise<SingleResponse<Customer>> => {
    const res = await api.get<SingleResponse<Customer>>(`/customers/${id}`)
    return res.data
  },

  getCustomerHistory: async (id: number, page = 1, limit = 10): Promise<PaginatedResponse<CustomerHistory>> => {
    const res = await api.get<PaginatedResponse<CustomerHistory>>(
      `/customers/${id}/history?page=${page}&limit=${limit}`
    )
    return res.data
  },

  getCustomerPoints: async (id: number, page = 1, limit = 10): Promise<PaginatedResponse<PointHistoryItem>> => {
    const res = await api.get<PaginatedResponse<PointHistoryItem>>(
      `/customers/${id}/points?page=${page}&limit=${limit}`
    )
    return res.data
  },

  createCustomer: async (data: CreateCustomerForm): Promise<SingleResponse<Customer>> => {
    const res = await api.post<SingleResponse<Customer>>('/customers', data)
    return res.data
  },

  updateCustomer: async (id: number, data: Partial<CreateCustomerForm>): Promise<SingleResponse<Customer>> => {
    const res = await api.put<SingleResponse<Customer>>(`/customers/${id}`, data)
    return res.data
  },

  toggleBlacklist: async (
    id: number,
    data: { isBlacklisted: boolean; reason?: string }
  ): Promise<SingleResponse<Customer>> => {
    const res = await api.patch<SingleResponse<Customer>>(`/customers/${id}/blacklist`, data)
    return res.data
  },

  redeemPoints: async (id: number, points: number, reason?: string): Promise<SingleResponse<Customer>> => {
    const res = await api.post<SingleResponse<Customer>>(`/customers/${id}/redeem-points`, { points, reason })
    return res.data
  },

  getBirthdayCustomers: async (): Promise<SingleResponse<Customer[]>> => {
    const res = await api.get<SingleResponse<Customer[]>>('/customers/birthdays')
    return res.data
  },
}
