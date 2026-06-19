import jwt from 'jsonwebtoken'

/** JWT access token lifetime (jsonwebtoken / ms format). */
export const JWT_EXPIRES_IN = '30d'

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

export function getJwtExpiresIn(): string {
  return JWT_EXPIRES_IN
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
    throw new Error(`[auth] JWT TTL is only ${ttlSec}s (expected ${JWT_EXPIRES_IN})`)
  }

  console.log(
    `[auth] JWT TTL=${JWT_EXPIRES_IN} (~${Math.round(ttlSec / 3600)}h) JWT_SECRET length=${secret.length}`,
  )
}
