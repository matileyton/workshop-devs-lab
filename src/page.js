import { sendJson } from './respond.js'

// Stub de la story 2: se reemplaza por la página (GET /).
export function handlePage(req, res) {
  sendJson(res, 501, { error: 'no implementado' })
}
