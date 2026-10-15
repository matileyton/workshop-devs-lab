import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'
import { filterByMonth } from './month.js'

export function buildExport({ month, includeVoid } = {}) {
  let invoices = listInvoices().filter((invoice) => includeVoid || invoice.status !== 'void')
  if (month) invoices = filterByMonth(invoices, month)
  return toCsv(invoices)
}
