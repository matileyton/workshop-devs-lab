import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'
import { filterByMonth } from './month.js'

// month lo implementa la story 2; includeVoid sigue en la firma para la story 3.
export function buildExport({ month, includeVoid } = {}) {
  let invoices = listInvoices().filter((invoice) => invoice.status !== 'void')
  if (month) invoices = filterByMonth(invoices, month)
  return toCsv(invoices)
}
