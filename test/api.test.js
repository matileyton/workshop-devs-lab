import assert from 'node:assert/strict'
import { request } from 'node:http'
import { test } from 'node:test'
import { listInvoices } from '../src/invoices.js'
import { withServer } from '../test-support/start-server.js'

async function get(baseUrl, path, options) {
  const res = await fetch(baseUrl + path, options)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    assert.fail(`el cuerpo de ${path} no es JSON: ${text.slice(0, 80)}`)
  }
  return { res, body }
}

const ids = (invoices) => invoices.map((invoice) => invoice.id)
const NO_STACK = /\bat\s+\S+.*:\d+:\d+/

function assertJsonError(res, body) {
  assert.match(res.headers.get('content-type'), /^application\/json/)
  assert.deepEqual(Object.keys(body), ['error'])
  assert.equal(typeof body.error, 'string')
  assert.ok(body.error.length > 0, 'el mensaje de error no puede estar vacío')
  assert.doesNotMatch(body.error, NO_STACK)
}

// P1
test('P1: GET /api/invoices sin filtros devuelve las 4 facturas, incluida la anulada', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /^application\/json/)
    assert.deepEqual(ids(body), ['F-1001', 'F-1002', 'F-1003', 'F-1004'])
    for (const invoice of body) {
      assert.deepEqual(Object.keys(invoice).sort(), ['amount', 'client', 'id', 'issuedAt', 'status'])
    }
    assert.deepEqual(body, listInvoices())
  }))

// P2
for (const [status, expected] of [
  ['paid', ['F-1001']],
  ['open', ['F-1002', 'F-1004']],
  ['void', ['F-1003']],
]) {
  test(`P2: ?status=${status} devuelve ${expected.join(' y ')}`, () =>
    withServer(async (baseUrl) => {
      const { res, body } = await get(baseUrl, `/api/invoices?status=${status}`)
      assert.equal(res.status, 200)
      assert.deepEqual(ids(body), expected)
      assert.ok(body.every((invoice) => invoice.status === status))
    }))
}

// P3
test('P3: ?month=2026-08 devuelve solo F-1001 y F-1002', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?month=2026-08')
    assert.equal(res.status, 200)
    assert.deepEqual(ids(body), ['F-1001', 'F-1002'])
    assert.ok(body.every((invoice) => invoice.issuedAt.startsWith('2026-08')))
  }))

test('P3: un mes válido sin facturas devuelve un arreglo vacío', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?month=2026-07')
    assert.equal(res.status, 200)
    assert.deepEqual(body, [])
  }))

// P4
test('P4: ?status=open&month=2026-09 devuelve solo F-1004', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?status=open&month=2026-09')
    assert.equal(res.status, 200)
    assert.deepEqual(ids(body), ['F-1004'])
    assert.equal(body[0].status, 'open')
    assert.equal(body[0].issuedAt, '2026-09-08')
  }))

// P5
test('P5: ?status=&month= (vacíos) equivale a no filtrar', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?status=&month=')
    assert.equal(res.status, 200)
    assert.deepEqual(body, listInvoices())
  }))

// P6: el mensaje es legible y menciona el valor inválido
for (const [query, valor] of [
  ['status=pagada', 'pagada'],
  ['month=2026-13', '2026-13'],
  ['month=2026-8', '2026-8'],
  ['status=pagada&month=2026-13', 'pagada'],
]) {
  test(`P6: ?${query} responde 400 con un error legible y sin stack trace`, () =>
    withServer(async (baseUrl) => {
      const { res, body } = await get(baseUrl, `/api/invoices?${query}`)
      assert.equal(res.status, 400)
      assertJsonError(res, body)
      assert.ok(body.error.includes(valor), `el mensaje debe mencionar ${valor}: ${body.error}`)
    }))
}

// P7
for (const path of ['/no-existe', '/api/otra']) {
  test(`P7: ${path} (ruta desconocida) responde 404 con JSON { error }`, () =>
    withServer(async (baseUrl) => {
      const { res, body } = await get(baseUrl, path)
      assert.equal(res.status, 404)
      assertJsonError(res, body)
    }))
}

for (const method of ['POST', 'PUT', 'DELETE']) {
  test(`P7: ${method} /api/invoices responde 405 con JSON { error }`, () =>
    withServer(async (baseUrl) => {
      const { res, body } = await get(baseUrl, '/api/invoices', { method })
      assert.equal(res.status, 405)
      assertJsonError(res, body)
    }))
}

// P19: una URL malformada no tumba el servidor. fetch normaliza la ruta, así que se usa node:http.
function rawRequest(baseUrl, { path = '/', headers = {} } = {}) {
  const { hostname, port } = new URL(baseUrl)
  return new Promise((resolve, reject) => {
    const req = request({ hostname, port, path, headers }, (res) => {
      let text = ''
      res.on('data', (chunk) => (text += chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }))
    })
    req.on('error', reject)
    req.end()
  })
}

test('P19: la ruta // responde 400 con JSON y el servidor sigue vivo', () =>
  withServer(async (baseUrl) => {
    const bad = await rawRequest(baseUrl, { path: '//' })
    assert.equal(bad.status, 400)
    assertJsonError({ headers: { get: (name) => bad.headers[name] } }, JSON.parse(bad.text))
    const { res } = await get(baseUrl, '/api/invoices')
    assert.equal(res.status, 200)
  }))

// P20: solo loopback y solo con Host local
test('P20: un Host que no es local responde 403 con JSON', () =>
  withServer(async (baseUrl) => {
    const bad = await rawRequest(baseUrl, { path: '/api/invoices', headers: { Host: 'evil.example.com' } })
    assert.equal(bad.status, 403)
    assert.match(bad.headers['content-type'], /^application\/json/)
    assert.equal(typeof JSON.parse(bad.text).error, 'string')
  }))

for (const host of ['localhost', 'localhost:3000', '127.0.0.1:8080', '[::1]:3000']) {
  test(`P20: el Host ${host} sí se acepta`, () =>
    withServer(async (baseUrl) => {
      const ok = await rawRequest(baseUrl, { path: '/api/invoices', headers: { Host: host } })
      assert.equal(ok.status, 200)
    }))
}

test('P20: startApp escucha solo en 127.0.0.1', async () => {
  const { startApp } = await import('../src/server.js')
  const server = startApp(0)
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    assert.equal(server.address().address, '127.0.0.1')
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
