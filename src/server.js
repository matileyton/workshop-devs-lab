import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleExport } from './export-route.js'
import { FilterError, filterInvoices, parseFilters } from './filters.js'
import { listInvoices } from './invoices.js'
import { handlePage } from './page.js'
import { sendJson } from './respond.js'

function handleInvoices(req, res, url) {
  const filters = parseFilters(url.searchParams)
  sendJson(res, 200, filterInvoices(listInvoices(), filters))
}

// Cada handler recibe (req, res, url). Las stories 2 y 3 reemplazan solo el suyo.
const routes = {
  '/': handlePage,
  '/api/invoices': handleInvoices,
  '/api/export.csv': handleExport,
}

export function createApp() {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const handler = routes[url.pathname]
    if (!handler) {
      return sendJson(res, 404, { error: `ruta no encontrada: ${url.pathname}` })
    }
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: `método no permitido: ${req.method}` }, { Allow: 'GET' })
    }
    try {
      handler(req, res, url)
    } catch (error) {
      if (error instanceof FilterError) return sendJson(res, 400, { error: error.message })
      console.error(error)
      sendJson(res, 500, { error: 'error interno del servidor' })
    }
  })
}

// Solo escucha al correr `node src/server.js`; al importarlo (tests) no abre ningún puerto.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000
  createApp().listen(port, () => console.log(`Panel de facturas en http://localhost:${port}`))
}
