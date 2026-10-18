/** Preserve numeric values; neutralize spreadsheet formulas in user-controlled text. */
export function toCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? '')
          if (typeof value === 'string' && /^(?:\s*[=+\-@]|[\t\r\n])/.test(text)) text = `'${text}`
          return `"${text.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
}
