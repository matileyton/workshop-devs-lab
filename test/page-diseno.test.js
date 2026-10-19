import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'
import * as pagina from '../src/page.js'

// Import de namespace: si una función todavía no existe, falla solo su test.
const invoices = listInvoices()
const scriptsDe = (html) =>
  [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join('\n')

// P21
test('P21: la página declara idioma, viewport, estilo propio, foco, movimiento reducido y el contenedor del gráfico', () => {
  const html = pagina.renderPage()
  assert.match(html, /<html[^>]*\blang="es"/)
  assert.match(html, /<meta[^>]*name="viewport"/)
  const estilo = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  assert.ok(estilo, 'falta el bloque <style> en línea')
  assert.ok(estilo[1].length > 1500, 'el estilo en línea es demasiado corto para ser un diseño')
  assert.match(estilo[1], /:focus-visible/)
  assert.match(estilo[1], /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(html, /id="cordillera"/)
  assert.doesNotMatch(html, /<[^>]*\b(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i)
  assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//i)
})

// P22
test('P22: renderCordillera devuelve vacío sin facturas', () => {
  assert.equal(pagina.renderCordillera([]), '')
})

test('P22: un pico por factura, con su id, su estado y su altura proporcional al monto', () => {
  const svg = pagina.renderCordillera(invoices)
  const picos = [...svg.matchAll(/<g\b[^>]*class="pico pico-([a-z]+)"[^>]*data-id="([^"]+)"[^>]*data-altura="(\d+)"/g)].map(
    ([, estado, id, altura]) => ({ estado, id, altura: Number(altura) }),
  )
  assert.equal(picos.length, 4)
  const porId = Object.fromEntries(picos.map((pico) => [pico.id, pico]))
  assert.deepEqual(Object.keys(porId).sort(), ['F-1001', 'F-1002', 'F-1003', 'F-1004'])
  assert.deepEqual(
    [porId['F-1001'].estado, porId['F-1002'].estado, porId['F-1003'].estado, porId['F-1004'].estado],
    ['pagada', 'abierta', 'anulada', 'abierta'],
  )
  assert.equal(porId['F-1003'].altura, 180) // el mayor monto (2.100.000)
  assert.equal(porId['F-1004'].altura, 39) // round(450000 / 2100000 * 180)
  assert.equal(porId['F-1001'].altura, 107)
  assert.equal(porId['F-1002'].altura, 76)
})

test('P22: la altura es relativa a lo que se ve y tiene un mínimo', () => {
  const sola = pagina.renderCordillera([invoices[3]])
  assert.match(sola, /data-altura="180"/)
  const casiCero = pagina.renderCordillera([
    { id: 'F-1', client: 'A', issuedAt: '2026-08-01', amount: 1, status: 'paid' },
    { id: 'F-2', client: 'B', issuedAt: '2026-08-01', amount: 1000000, status: 'paid' },
  ])
  assert.match(casiCero, /data-id="F-1"[^>]*data-altura="8"/)
})

test('P22: cada pico trae un <title> legible y escapado', () => {
  const svg = pagina.renderCordillera([
    { id: 'F-9001', client: '<script>alert(1)</script> & Cía', issuedAt: '2026-08-02', amount: 1000, status: 'open' },
  ])
  assert.doesNotMatch(svg, /<script>/i)
  const titulo = svg.match(/<title>([\s\S]*?)<\/title>/)
  assert.ok(titulo, 'el pico no trae <title>')
  assert.ok(titulo[1].includes('F-9001'))
  assert.ok(titulo[1].includes('&lt;script&gt;'))
  assert.ok(titulo[1].includes('&amp;'))
})

test('P22 y P24: la página incrusta las mismas funciones que prueba el test', () => {
  const scripts = scriptsDe(pagina.renderPage())
  for (const nombre of ['renderCordillera', 'interpolar', 'formatearPesos']) {
    assert.equal(typeof pagina[nombre], 'function', `falta exportar ${nombre}`)
    assert.ok(scripts.includes(pagina[nombre].toString()), `el <script> no incrusta la misma ${nombre}`)
  }
})

// P23
test('P23: cada fila trae data-id y data-estado en español, y su contenido no cambia', () => {
  const fila = pagina.renderRows([invoices[0]])
  assert.match(fila, /<tr[^>]*\bdata-id="F-1001"/)
  assert.match(fila, /<tr[^>]*\bdata-estado="pagada"/)
  assert.doesNotMatch(fila, /\bpaid\b/)
  assert.equal((fila.match(/<td/g) ?? []).length, 5)
})

test('P23: el id sale escapado en data-id', () => {
  const fila = pagina.renderRows([
    { id: 'F-"><img src=x>', client: 'A', issuedAt: '2026-08-01', amount: 1, status: 'open' },
  ])
  assert.doesNotMatch(fila, /<img/)
  assert.ok(fila.includes('data-id="F-&quot;&gt;&lt;img src=x&gt;"'))
})

// P24
test('P24: interpolar baja y sube de forma monótona entre los extremos', () => {
  assert.equal(pagina.interpolar(0, 4690000, 0), 0)
  assert.equal(pagina.interpolar(0, 4690000, 1), 4690000)
  let anterior = -1
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const valor = pagina.interpolar(0, 4690000, Math.min(t, 1))
    assert.ok(Number.isInteger(valor))
    assert.ok(valor >= anterior, `bajó en t=${t}`)
    anterior = valor
  }
  assert.equal(pagina.interpolar(1250000, 0, 0), 1250000)
  assert.equal(pagina.interpolar(1250000, 0, 1), 0)
  assert.ok(pagina.interpolar(1250000, 0, 0.5) < 1250000)
  assert.ok(pagina.interpolar(1250000, 0, 0.5) > 0)
})

test('P24: formatearPesos separa los miles con punto y deja las celdas de la tabla sin formato', () => {
  assert.equal(pagina.formatearPesos(4690000), '4.690.000')
  assert.equal(pagina.formatearPesos(1250000), '1.250.000')
  assert.equal(pagina.formatearPesos(890000), '890.000')
  assert.equal(pagina.formatearPesos(0), '0')
  assert.match(pagina.renderRows([invoices[0]]), /<td>1250000<\/td>/)
})
