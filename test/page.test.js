import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'
import { buildExportUrl, computeTotal, renderRows } from '../src/page.js'
import { withServer } from '../test-support/start-server.js'

// T-02-panel, story 2 (workdocs/PLAN.md). Criterios P8, P9, P10, P17 y P18 de la
// sección "T-02-panel" de workdocs/SPEC.md.
//
// El test se escribió en rojo antes del código (commit cdacfaa), cuando la story 1
// todavía no estaba en `main` y los imports tenían que ser dinámicos. Con la story 1
// mergeada, los imports vuelven a ser estáticos y el servidor se levanta con el
// helper compartido test-support/start-server.js (puerto 0), como pide el PLAN.

async function getPage() {
  return withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`)
    return { response, html: await response.text() }
  })
}

// Texto visible de un elemento: sin etiquetas internas, para no imponer el marcado.
function texto(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ')
    .trim()
}

function celdas(fila) {
  return [...fila.matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi)].map((match) => texto(match[1]))
}

test('P8: GET / sirve el HTML con la tabla, los filtros, el total y la descarga', async () => {
  const { response, html } = await getPage()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')

  // Tabla con las 5 columnas que pide María, en orden. Se mira solo el <thead>
  // (el `(?:\s[^>]*)?` evita además que <thead> cuente como celda de encabezado).
  const thead = html.match(/<thead[\s\S]*?<\/thead>/i)
  assert.ok(thead, 'la tabla no trae <thead>')
  const columnas = [...thead[0].matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/gi)].map((match) =>
    texto(match[1]).toLowerCase(),
  )
  assert.deepEqual(columnas, ['id', 'cliente', 'fecha', 'monto', 'estado'])

  // Selector de estado: las etiquetas en español contra los valores del JSON (SPEC,
  // reglas de T-02-panel), y el vacío para "todos". Se comparan los pares, no las
  // dos listas por separado: si no, <option value="paid">anulada</option> pasaría.
  // El orden lo fija la SPEC, que enumera "todos, pagada, abierta, anulada".
  const selector = html.match(/<select[\s\S]*?<\/select>/i)
  assert.ok(selector, 'falta el selector de estado')
  const opciones = [
    ...selector[0].matchAll(/<option[^>]*value\s*=\s*["']?([^"'>\s]*)["']?[^>]*>([\s\S]*?)<\/option>/gi),
  ].map(([, valor, etiqueta]) => [valor, texto(etiqueta).toLowerCase()])
  assert.deepEqual(opciones, [
    ['', 'todos'],
    ['paid', 'pagada'],
    ['open', 'abierta'],
    ['void', 'anulada'],
  ])

  // Campo de mes: pattern y placeholder van en el mismo input que el type="month",
  // porque son los que guían a María donde el navegador lo muestra como texto. Van
  // como texto literal porque así los escribe la SPEC.
  const mes = html.match(/<input[^>]*type\s*=\s*["']?month\b[^>]*>/i)
  assert.ok(mes, 'falta el campo de mes type="month"')
  assert.ok(mes[0].includes('pattern="\\d{4}-(0[1-9]|1[0-2])"'), `el campo de mes no trae el pattern: ${mes[0]}`)
  assert.ok(mes[0].includes('placeholder="2026-08"'), `el campo de mes no trae el placeholder: ${mes[0]}`)

  // La SPEC fija id="error" para el área de error. El id del total lo fija este test:
  // la SPEC solo pide "el elemento del total".
  assert.match(html, /id="error"/)
  assert.match(html, /id="total"/)

  // Casilla de anuladas, desmarcada por defecto (decidido en el grill) y con su
  // etiqueta asociada: envolviéndola o con un for= que apunte a su id.
  const casilla = html.match(/<input[^>]*type\s*=\s*["']?checkbox\b[^>]*>/i)
  assert.ok(casilla, 'falta la casilla de anuladas')
  assert.doesNotMatch(casilla[0], /\bchecked\b/i)

  const etiqueta = [...html.matchAll(/<label[^>]*>[\s\S]*?<\/label>/gi)]
    .map((match) => match[0])
    .find((label) => label.includes('Incluir anuladas en el CSV'))
  assert.ok(etiqueta, 'falta la etiqueta "Incluir anuladas en el CSV"')
  const id = casilla[0].match(/\bid\s*=\s*["']?([^"'>\s]+)/i)
  const asociada =
    /<input[^>]*type\s*=\s*["']?checkbox\b/i.test(etiqueta) ||
    (id !== null && new RegExp(`for\\s*=\\s*["']?${id[1]}\\b`, 'i').test(etiqueta))
  assert.ok(asociada, 'la etiqueta "Incluir anuladas en el CSV" no está asociada a la casilla')

  // El botón tiene que ser accionable, no un texto suelto.
  assert.match(html, /<(?:a|button)\b[^>]*>[^<]*Descargar CSV/i)
})

test('P9: computeTotal suma los amount de lo que se ve', () => {
  const invoices = listInvoices()

  assert.equal(computeTotal([]), 0)
  assert.equal(computeTotal(invoices), 4690000)
  assert.equal(
    computeTotal(invoices.filter((invoice) => invoice.status === 'paid')),
    1250000,
  )
})

test('P10 y P18: el HTML no carga nada externo e incrusta las mismas funciones del test', async () => {
  const { html } = await getPage()

  // Ningún src ni href externo: la página es un solo HTML con su JS en línea.
  assert.doesNotMatch(html, /<[^>]*\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i)
  // Tampoco por la puerta de atrás del CSS en línea.
  assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//i)

  // Las funciones tienen que estar dentro de un <script> que el navegador ejecute,
  // no sueltas en el documento. Si el HTML trae una copia distinta, el test estaría
  // probando otra función que la que corre en la página de María.
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join('\n')
  assert.ok(
    scripts.includes(computeTotal.toString()),
    'el <script> de la página no incrusta la misma computeTotal que prueba el test',
  )
  assert.ok(
    scripts.includes(renderRows.toString()),
    'el <script> de la página no incrusta la misma renderRows que prueba el test',
  )
})

test('P17: buildExportUrl arma la URL solo con los filtros que hay', () => {
  // El orden de los parámetros (status, month, includeVoid) lo fija este test: la
  // SPEC fija cuáles salen y cuáles no, no el orden.
  assert.equal(buildExportUrl({ status: '', month: '', includeVoid: false }), '/api/export.csv')
  assert.equal(
    buildExportUrl({ status: '', month: '2026-08', includeVoid: false }),
    '/api/export.csv?month=2026-08',
  )
  assert.equal(
    buildExportUrl({ status: 'paid', month: '', includeVoid: false }),
    '/api/export.csv?status=paid',
  )
  assert.equal(
    buildExportUrl({ status: '', month: '', includeVoid: true }),
    '/api/export.csv?includeVoid=true',
  )
  assert.equal(
    buildExportUrl({ status: 'paid', month: '', includeVoid: true }),
    '/api/export.csv?status=paid&includeVoid=true',
  )
  assert.equal(
    buildExportUrl({ status: 'void', month: '2026-09', includeVoid: true }),
    '/api/export.csv?status=void&month=2026-09&includeVoid=true',
  )
  // includeVoid=false no viaja nunca: equivale a no mandarlo (P16).
  assert.equal(
    buildExportUrl({ status: 'open', month: '2026-09', includeVoid: false }),
    '/api/export.csv?status=open&month=2026-09',
  )
})

test('P18: renderRows arma una fila de 5 celdas por factura, en el orden de las columnas', () => {
  assert.equal(renderRows([]), '')

  const invoices = listInvoices()
  const fila = renderRows([invoices[0]])

  assert.equal((fila.match(/<tr/gi) ?? []).length, 1)
  // El orden importa: es el mismo de los <th> que exige P8.
  // El estado sale como etiqueta ("la página los muestra como pagada, abierta y
  // anulada", SPEC, reglas de T-02-panel), no con el valor del JSON.
  assert.deepEqual(celdas(fila), ['F-1001', 'Constructora Sur', '2026-08-02', '1250000', 'pagada'])
  assert.doesNotMatch(fila, /\bpaid\b/)

  const todas = renderRows(invoices)
  assert.equal((todas.match(/<tr/gi) ?? []).length, 4)
  assert.equal((todas.match(/<td/gi) ?? []).length, 20)
  for (const id of ['F-1001', 'F-1002', 'F-1003', 'F-1004']) {
    assert.ok(todas.includes(id), `faltan las filas de ${id}`)
  }
})

test('P18: renderRows escapa el HTML del cliente', () => {
  const inyeccion = renderRows([
    {
      id: 'F-9001',
      client: '<script>alert(1)</script>',
      issuedAt: '2026-08-02',
      amount: 1000,
      status: 'open',
    },
  ])

  assert.doesNotMatch(inyeccion, /<script>/i)
  assert.ok(
    inyeccion.includes('&lt;script&gt;'),
    'el cliente con etiquetas no sale escapado',
  )

  const ampersand = renderRows([
    {
      id: 'F-9002',
      client: 'Ñuñoa & Cía.',
      issuedAt: '2026-09-08',
      amount: 2000,
      status: 'void',
    },
  ])

  assert.ok(ampersand.includes('Ñuñoa &amp; Cía.'), 'el & del cliente no sale escapado')
})
