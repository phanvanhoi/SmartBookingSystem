/**
 * Format số tiền VNĐ
 * formatCurrency(1500000) → "1,500,000"
 * formatCurrency(1500000, true) → "1,500,000 VNĐ"
 */
export function formatCurrency(amount: number, withUnit = false): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.round(amount))
  return withUnit ? `${formatted} VNĐ` : formatted
}

/**
 * Format số tiền rút gọn
 * formatCurrencyShort(1500000) → "1.5M"
 * formatCurrencyShort(500000) → "500K"
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`
  }
  return String(amount)
}
