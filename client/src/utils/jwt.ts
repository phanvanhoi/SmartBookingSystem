interface JwtPayload {
  exp?: number
  iat?: number
}

/** Strip wrapping quotes / accidental "Bearer " prefix from stored tokens. */
export function normalizeStoredToken(raw: string | null | undefined): string | null {
  if (!raw) return null
  let t = raw.trim()
  if (!t) return null

  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim()
  }

  if (t.toLowerCase().startsWith('bearer ')) {
    t = t.slice(7).trim()
  }

  return t.length > 0 ? t : null
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}
/** True when JWT exp is in the past (30s clock skew). */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000
}

export function getJwtExpiresAt(token: string): Date | null {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return null
  return new Date(payload.exp * 1000)
}
