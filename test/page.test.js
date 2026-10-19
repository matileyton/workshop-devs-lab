import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'

// T-02-panel, story 2 (workdocs/PLAN.md). Criterios P8, P9, P10, P17 y P18 de la
// sección "T-02-panel" de workdocs/SPEC.md.
//
// Test rojo: se escribe antes del código de producto. Mientras la story 1 no esté
// en `main`, este worktree no tiene src/server.js ni src/page.js, así que los
// imports van dinámicos dentro de cada test. Así cada criterio falla por su cuenta
// y con el motivo a la vista (falta el módulo o la función), en vez de voltear el
// archivo entero con un solo ERR_MODULE_NOT_FOUND al cargarlo.

async function loadPage() {
  return import('../src/page.js')
}

// createApp() es el contrato que deja la story 1 (PLAN.md): devuelve el http.Server
// sin escuchar. El puerto 0 deja que el sistema elija uno libre.
async function startServer() {
  const { createApp } = await import('../src/server.js')
  const server = createApp()

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

async function getPage() {
  const server = await startServer()
  try {
    const response = await fetch(`${server.base}/`)
    return { response, html: await response.text() }
  } finally {
    await server.close()
  }
}

test('P8: GET / sirve el HTML con la tabla, los filtros, el total y la descarga', async () => {
  const { response, html } = await getPage()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')

  // Tabla con las 5 columnas que pide María, en orden.
  assert.match(html, /<table/i)
  // El `(?:\s[^>]*)?` evita que <thead> cuente como una celda de encabezado.
  const columnas = [...html.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/gi)].map((match) =>
    match[1].trim().toLowerCase(),
  )
  assert.deepEqual(columnas, ['id', 'cliente', 'fecha', 'monto', 'estado'])

  // Selector de estado: las etiquetas en español, los valores del JSON (SPEC, reglas
  // de T-02-panel), y el vacío para "todos".
  const selector = html.match(/<select[\s\S]*?<\/select>/i)
  assert.ok(selector, 'falta el selector de estado')
  for (const valor of ['value=""', 'value="paid"', 'value="open"', 'value="void"']) {
    assert.ok(selector[0].includes(valor), `el selector de estado no trae ${valor}`)
  }
  for (const etiqueta of ['todos', 'pagada', 'abierta', 'anulada']) {
    assert.match(selector[0], new RegExp(etiqueta, 'i'))
  }

  // Campo de mes: pattern y placeholder van en el mismo input que el type="month",
  // porque son los que guían a María donde el navegador lo muestra como texto.
  const mes = html.match(/<input[^>]*type="month"[^>]*>/i)
  assert.ok(mes, 'falta el campo de mes type="month"')
  assert.ok(mes[0].includes('pattern="\\d{4}-(0[1-9]|1[0-2])"'), `el campo de mes no trae el pattern: ${mes[0]}`)
  assert.ok(mes[0].includes('placeholder="2026-08"'), `el campo de mes no trae el placeholder: ${mes[0]}`)

  // La spec fija id="error" para el área de error. El id del total lo fija este test:
  // la spec solo pide "el elemento del total".
  assert.match(html, /id="error"/)
  assert.match(html, /id="total"/)

  // Casilla de anuladas, desmarcada por defecto (decidido en el grill).
  const casilla = html.match(/<input[^>]*type="checkbox"[^>]*>/i)
  assert.ok(casilla, 'falta la casilla de anuladas')
  assert.doesNotMatch(casilla[0], /\bchecked\b/i)
  assert.match(html, /Incluir anuladas en el CSV/)

  assert.match(html, /Descargar CSV/)
})

test('P9: computeTotal suma los amount de lo que se ve', async () => {
  const { computeTotal } = await loadPage()
  assert.equal(typeof computeTotal, 'function', 'src/page.js no exporta computeTotal')

  const invoices = listInvoices()

  assert.equal(computeTotal([]), 0)
  assert.equal(computeTotal(invoices), 4690000)
  assert.equal(
    computeTotal(invoices.filter((invoice) => invoice.status === 'paid')),
    1250000,
  )
})

test('P10 y P18: el HTML no carga nada externo e incrusta las mismas funciones del test', async () => {
  const { computeTotal, renderRows } = await loadPage()
  const { html } = await getPage()

  // Ningún src ni href externo: la página es un solo HTML con su JS en línea.
  assert.doesNotMatch(html, /(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i)

  // Si el HTML trae una copia distinta, el test estaría probando otra función.
  assert.ok(
    html.includes(computeTotal.toString()),
    'el HTML no incrusta la misma computeTotal que prueba el test',
  )
  assert.ok(
    html.includes(renderRows.toString()),
    'el HTML no incrusta la misma renderRows que prueba el test',
  )
})

test('P17: buildExportUrl arma la URL solo con los filtros que hay', async () => {
  const { buildExportUrl } = await loadPage()
  assert.equal(typeof buildExportUrl, 'function', 'src/page.js no exporta buildExportUrl')

  // El orden de los parámetros (status, month, includeVoid) lo fija este test: la
  // spec fija cuáles salen y cuáles no, no el orden.
  assert.equal(buildExportUrl({ status: '', month: '', includeVoid: false }), '/api/export.csv')
  assert.equal(
    buildExportUrl({ status: '', month: '2026-08', includeVoid: false }),
    '/api/export.csv?month=2026-08',
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

test('P18: renderRows arma una fila de 5 celdas por factura', async () => {
  const { renderRows } = await loadPage()
  assert.equal(typeof renderRows, 'function', 'src/page.js no exporta renderRows')

  assert.equal(renderRows([]), '')

  const invoices = listInvoices()
  const fila = renderRows([invoices[0]])

  assert.equal((fila.match(/<tr/gi) ?? []).length, 1)
  assert.equal((fila.match(/<td/gi) ?? []).length, 5)
  for (const valor of ['F-1001', 'Constructora Sur', '2026-08-02', '1250000']) {
    assert.ok(fila.includes(valor), `la fila no trae ${valor}`)
  }
  // "La página los muestra como pagada, abierta y anulada" (SPEC, reglas de T-02-panel).
  assert.match(fila, /pagada/i)

  assert.equal((renderRows(invoices).match(/<tr/gi) ?? []).length, 4)
})

test('P18: renderRows escapa el HTML del cliente', async () => {
  const { renderRows } = await loadPage()

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
