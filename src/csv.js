const BOM = '﻿'
const HEADER = ['id', 'cliente', 'fecha', 'monto', 'estado']

function escapeField(value) {
  const text = String(value)
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(invoices) {
  const rows = invoices.map((i) => [i.id, i.client, i.issuedAt, i.amount, i.status])
  return BOM + [HEADER, ...rows].map((row) => row.map(escapeField).join(';') + '\r\n').join('')
}
