import { sendJson } from './respond.js'

// Stub de la story 3: se reemplaza por la descarga (GET /api/export.csv).
export function handleExport(req, res) {
  sendJson(res, 501, { error: 'no implementado' })
}
