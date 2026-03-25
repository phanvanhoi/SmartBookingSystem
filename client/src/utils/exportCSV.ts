/**
 * Export data as CSV file and trigger browser download.
 */
export function exportCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel Vietnamese support
  const csvHeaders = headers.join(',')
  const csvRows = rows.map((row) =>
    row
      .map((cell) => {
        if (cell == null) return ''
        const str = String(cell)
        // Escape quotes and wrap in quotes if contains comma/newline/quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  )

  const csvContent = BOM + [csvHeaders, ...csvRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
