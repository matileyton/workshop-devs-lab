import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'

// month e includeVoid ya están en la firma; las stories 2 y 3 los implementan.
export function buildExport({ month, includeVoid } = {}) {
  return toCsv(listInvoices().filter((invoice) => invoice.status !== 'void'))
}
