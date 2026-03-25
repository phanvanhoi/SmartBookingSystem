export const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  MANAGER: 3,
  CASHIER: 2,
  STAFF: 1,
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const SALT_ROUNDS = 12
export const MAX_LOGIN_ATTEMPTS = 5
export const LOGIN_WINDOW_MINUTES = 15

export const WARNING_BEFORE_MINUTES = 15
export const MIN_DURATION_MINUTES = 60
