import { toCsv } from './csv.js'
import { listInvoices } from './invoices.js'

// month ya está en la firma; la story 2 lo implementa.
export function buildExport({ month, includeVoid } = {}) {
  return toCsv(listInvoices().filter((invoice) => includeVoid || invoice.status !== 'void'))
}
