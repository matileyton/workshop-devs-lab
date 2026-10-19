// Página del panel (GET /). Story 2 de T-02-panel: criterios P8, P9, P10, P17 y P18
// de workdocs/SPEC.md. Un solo HTML con su JS en línea, sin nada externo.
//
// computeTotal, renderRows y buildExportUrl son puras y se exportan para el test.
// El <script> de la página las incrusta con .toString(), así María corre exactamente
// las funciones que el test prueba.

// En la API el estado va con los valores del JSON; la página los muestra en español.
const ESTADOS = { paid: 'pagada', open: 'abierta', void: 'anulada' }

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function computeTotal(invoices) {
  return invoices.reduce((total, invoice) => total + invoice.amount, 0)
}

export function renderRows(invoices) {
  return invoices
    .map((invoice) => {
      const estado = ESTADOS[invoice.status] ?? invoice.status
      const celdas = [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, estado]
      return `<tr>${celdas.map((celda) => `<td>${escapeHtml(celda)}</td>`).join('')}</tr>`
    })
    .join('')
}

export function buildExportUrl({ status, month, includeVoid }) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (month) params.set('month', month)
  // includeVoid=false equivale a no mandarlo: el CSV ya excluye las anuladas (T-01).
  if (includeVoid) params.set('includeVoid', 'true')
  const query = params.toString()
  return query ? `/api/export.csv?${query}` : '/api/export.csv'
}

// Manda la consulta más nueva: una respuesta que llega tarde no puede pisar la tabla
// con el filtro anterior. Hallazgo de la review del PR #13.
export function crearTurnos() {
  let ultimo = 0
  return {
    pedir: () => (ultimo += 1),
    vigente: (turno) => turno === ultimo,
  }
}

// Un error sin mensaje no se le muestra a María como "undefined".
export function mensajeDeError(status, cuerpo) {
  const mensaje = cuerpo?.error
  if (typeof mensaje === 'string' && mensaje !== '') return mensaje
  return `La API respondió ${status} sin explicar el error.`
}

function renderOptions() {
  const opciones = [['', 'todos'], ...Object.entries(ESTADOS)]
  return opciones
    .map(([valor, etiqueta]) => `<option value="${valor}">${etiqueta}</option>`)
    .join('\n      ')
}

function renderScript() {
  return `
const ESTADOS = ${JSON.stringify(ESTADOS)}

${escapeHtml.toString()}

${computeTotal.toString()}

${renderRows.toString()}

${buildExportUrl.toString()}

${crearTurnos.toString()}

${mensajeDeError.toString()}

const turnos = crearTurnos()

const estado = document.getElementById('estado')
const mes = document.getElementById('mes')
const anuladas = document.getElementById('anuladas')
const filas = document.getElementById('filas')
const total = document.getElementById('total')
const error = document.getElementById('error')
const descargar = document.getElementById('descargar')

function filtros() {
  return { status: estado.value, month: mes.value, includeVoid: anuladas.checked }
}

function actualizarDescarga() {
  descargar.setAttribute('href', buildExportUrl(filtros()))
}

async function cargar() {
  const { status, month } = filtros()
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (month) params.set('month', month)
  const query = params.toString()
  const turno = turnos.pedir()

  let respuesta
  let cuerpo
  // El try cubre solo la red: si falla el render, el mensaje no culpa a la API.
  try {
    respuesta = await fetch('/api/invoices' + (query ? '?' + query : ''))
    cuerpo = await respuesta.json()
  } catch {
    if (turnos.vigente(turno)) {
      error.textContent = 'No se pudo consultar la API. ¿Sigue corriendo node src/server.js?'
    }
    return
  }

  // Llegó tarde: ya hay una consulta más nueva en vuelo.
  if (!turnos.vigente(turno)) return

  if (!respuesta.ok) {
    // La tabla queda como estaba: María sigue viendo lo último que cargó bien.
    error.textContent = mensajeDeError(respuesta.status, cuerpo)
    return
  }
  error.textContent = ''
  filas.innerHTML = renderRows(cuerpo)
  total.textContent = computeTotal(cuerpo)
}

for (const campo of [estado, mes]) {
  campo.addEventListener('change', () => {
    actualizarDescarga()
    cargar()
  })
}
anuladas.addEventListener('change', actualizarDescarga)

actualizarDescarga()
cargar()
`
}

export function renderPage() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panel de facturas — Andes Lab</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 60rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; }
    td:nth-child(4) { text-align: right; }
    #error:empty { display: none; }
    #error { background: #fdecea; padding: 0.6rem; }
    .filtros { display: flex; gap: 1rem; align-items: end; flex-wrap: wrap; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>Facturas</h1>

  <div class="filtros">
    <p>
      <label for="estado">Estado</label><br>
      <select id="estado" name="estado">
      ${renderOptions()}
      </select>
    </p>
    <p>
      <label for="mes">Mes</label><br>
      <input id="mes" name="mes" type="month" pattern="\\d{4}-(0[1-9]|1[0-2])" placeholder="2026-08">
    </p>
  </div>

  <p id="error" role="alert"></p>

  <table>
    <thead>
      <tr><th>id</th><th>cliente</th><th>fecha</th><th>monto</th><th>estado</th></tr>
    </thead>
    <tbody id="filas"></tbody>
  </table>

  <p>Total: <span id="total">0</span></p>

  <p>
    <label><input id="anuladas" name="anuladas" type="checkbox"> Incluir anuladas en el CSV</label>
  </p>

  <p><a id="descargar" href="/api/export.csv" download>Descargar CSV</a></p>

  <script>${renderScript()}</script>
</body>
</html>
`
}

export function handlePage(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(renderPage())
}
