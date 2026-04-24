/**
 * Extract a human-readable error message from an unknown thrown value.
 *
 * Handles the common shapes we encounter:
 *  - Axios errors (`response.data.error.message` or `response.data.message`)
 *  - Plain `Error` instances
 *  - String or other primitives
 *
 * Always returns a non-empty string so UI never shows "undefined".
 */
export function getErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (typeof err === 'string') return err

  if (err && typeof err === 'object') {
    const e = err as {
      response?: { data?: { error?: { message?: string }; message?: string } }
      message?: string
    }
    const apiMsg =
      e.response?.data?.error?.message ?? e.response?.data?.message ?? e.message
    if (typeof apiMsg === 'string' && apiMsg.length > 0) return apiMsg
  }

  return fallback
}

/**
 * Extract the API error code (eg. `ROOM_NOT_AVAILABLE`) when present.
 * Used for branching logic that needs to behave differently per error code.
 */
export function getErrorCode(err: unknown): string | null {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: { code?: string } } } }
    const code = e.response?.data?.error?.code
    if (typeof code === 'string') return code
  }
  return null
}
