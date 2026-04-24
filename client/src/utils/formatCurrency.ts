/**
 * Format số tiền VNĐ. Safe with undefined/null/NaN — falls back to "0"
 * so the UI never shows the literal string "NaN" if the API returns no value.
 */
export function formatCurrency(
  amount: number | null | undefined,
  withUnit = false,
): string {
  const safe =
    typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0
  const formatted = new Intl.NumberFormat('vi-VN').format(safe)
  return withUnit ? `${formatted} VNĐ` : formatted
}

/**
 * Format số tiền rút gọn — safe variant.
 * formatCurrencyShort(1500000) → "1.5M"
 * formatCurrencyShort(500000)  → "500K"
 */
export function formatCurrencyShort(amount: number | null | undefined): string {
  const safe =
    typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (safe >= 1_000) {
    return `${(safe / 1_000).toFixed(0)}K`
  }
  return String(safe)
}
