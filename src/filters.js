import { filterByMonth, isValidMonth } from './month.js'

const STATUSES = ['paid', 'open', 'void']

// Error de entrada del usuario: el servidor lo responde como 400 con el mensaje tal cual.
export class FilterError extends Error {}

// Un parámetro ausente o vacío equivale a no filtrar.
export function parseFilters(searchParams) {
  const status = searchParams.get('status') ?? ''
  const month = searchParams.get('month') ?? ''
  if (status !== '' && !STATUSES.includes(status)) {
    throw new FilterError(`status inválido: ${status} (use paid, open o void)`)
  }
  if (month !== '' && !isValidMonth(month)) {
    throw new FilterError(`month inválido: ${month} (use YYYY-MM, por ejemplo 2026-08)`)
  }
  return { status, month }
}

export function filterInvoices(invoices, { status = '', month = '' } = {}) {
  let result = invoices
  if (status !== '') result = result.filter((invoice) => invoice.status === status)
  if (month !== '') result = filterByMonth(result, month)
  return result
}
