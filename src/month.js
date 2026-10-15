const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMonth(value) {
  return typeof value === 'string' && MONTH_PATTERN.test(value)
}

export function filterByMonth(invoices, month) {
  return invoices.filter((invoice) => invoice.issuedAt.slice(0, 7) === month)
}
