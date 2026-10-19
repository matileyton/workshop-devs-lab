import { toCsv } from './csv.js'
import { buildExport } from './export.js'
import { FilterError, filterInvoices, parseFilters } from './filters.js'
import { listInvoices } from './invoices.js'

// includeVoid solo acepta true o false; ausente o vacío equivale a false.
function parseIncludeVoid(searchParams) {
  const value = searchParams.get('includeVoid') ?? ''
  if (value === '' || value === 'false') return false
  if (value === 'true') return true
  throw new FilterError(`includeVoid inválido: ${value} (use true o false)`)
}

// GET /api/export.csv: el CSV de T-01 con los filtros del panel.
// Un filtro inválido lanza FilterError y server.js responde 400 antes de escribir cabeceras.
export function handleExport(req, res, url) {
  const { status, month } = parseFilters(url.searchParams)
  const includeVoid = parseIncludeVoid(url.searchParams)
  // status manda: con status se exporta solo ese estado e includeVoid no aplica.
  const csv =
    status !== ''
      ? toCsv(filterInvoices(listInvoices(), { status, month }))
      : buildExport({ month, includeVoid })
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="facturas.csv"',
  })
  res.end(csv)
}
