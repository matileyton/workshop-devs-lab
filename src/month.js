const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMonth(value) {
  return typeof value === 'string' && MONTH_PATTERN.test(value)
}

export function filterByMonth(invoices, month) {
  // Una factura sin issuedAt usable no pertenece a ningún mes: se omite en vez de
  // voltear la exportación entera con un TypeError (criterio 15 de la SPEC).
  return invoices.filter(
    (invoice) => typeof invoice.issuedAt === 'string' && invoice.issuedAt.slice(0, 7) === month,
  )
}
