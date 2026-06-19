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
  return (process.env.JWT_EXPIRES_IN ?? '30d').trim()
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
  console.log(`[auth] JWT_EXPIRES_IN=${getJwtExpiresIn()} JWT_SECRET length=${secret.length}`)
}
