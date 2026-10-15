const BOM = '﻿'
const HEADER = ['id', 'cliente', 'fecha', 'monto', 'estado']

function escapeField(value) {
  if (value == null) return ''
  // Excel interpreta como fórmula un texto que empieza con = + - @ tab o CR (CWE-1236).
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(invoices) {
  const rows = invoices.map((i) => [i.id, i.client, i.issuedAt, i.amount, i.status])
  return BOM + [HEADER, ...rows].map((row) => row.map(escapeField).join(';') + '\r\n').join('')
}
