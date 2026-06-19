import jwt from 'jsonwebtoken'

const DURATION_RE = /^(\d+)([smhdw])$/i

/**
 * Normalize JWT_SECRET from docker / .env (trim, strip wrapping quotes).
 */
export function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET?.trim() ?? ''
  if (!raw) return ''

  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1)
  }

  return raw
}

function stripQuotes(value: string): string {
  const t = value.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim()
  }
  return t
}

/**
 * Normalize JWT_EXPIRES_IN for jsonwebtoken.
 * Bare "48" without unit → instant expiry in jsonwebtoken — treat as 48h.
 */
export function getJwtExpiresIn(): string {
  const raw = stripQuotes(process.env.JWT_EXPIRES_IN ?? '30d')

  if (DURATION_RE.test(raw)) {
    return raw
  }

  const bare = /^(\d+)$/.exec(raw)
  if (bare) {
    console.warn(
      `[auth] JWT_EXPIRES_IN="${raw}" has no unit — using ${bare[1]}h (prefer e.g. 48h or 30d).`,
    )
    return `${bare[1]}h`
  }

  console.warn(`[auth] Invalid JWT_EXPIRES_IN="${raw}", using 30d`)
  return '30d'
}

export function assertJwtConfig(): void {
  const secret = getJwtSecret()
  if (!secret) {
    throw new Error('JWT_SECRET is missing or empty')
  }
  if (secret.length < 16) {
    console.warn(
      '[auth] JWT_SECRET is shorter than 16 characters — use a long random value in production.',
    )
  }

  const expiresIn = getJwtExpiresIn()
  const test = jwt.sign({ ping: true }, secret, { expiresIn } as jwt.SignOptions)
  const decoded = jwt.verify(test, secret) as jwt.JwtPayload
  const ttlSec = (decoded.exp ?? 0) - Math.floor(Date.now() / 1000)

  if (ttlSec < 3600) {
    throw new Error(
      `[auth] JWT TTL is only ${ttlSec}s — check JWT_EXPIRES_IN (resolved: "${expiresIn}")`,
    )
  }

  console.log(
    `[auth] JWT_EXPIRES_IN=${expiresIn} (~${Math.round(ttlSec / 3600)}h TTL) JWT_SECRET length=${secret.length}`,
  )
}
