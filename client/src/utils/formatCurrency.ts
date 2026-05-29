function toSafeAmount(amount: number | string | null | undefined): number {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : 0
  }
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * Format số tiền VNĐ. Safe with undefined/null/NaN/string — falls back to "0"
 * so the UI never shows the literal string "NaN" if the API returns no value.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  withUnit = false,
): string {
  const safe = Math.round(toSafeAmount(amount))
  const formatted = new Intl.NumberFormat('vi-VN').format(safe)
  return withUnit ? `${formatted} VNĐ` : formatted
}

/**
 * Format số tiền rút gọn — safe variant.
 * formatCurrencyShort(1500000) → "1.5M"
 * formatCurrencyShort(500000)  → "500K"
 */
export function formatCurrencyShort(amount: number | string | null | undefined): string {
  const safe = toSafeAmount(amount)
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (safe >= 1_000) {
    return `${(safe / 1_000).toFixed(0)}K`
  }
  return String(safe)
}
