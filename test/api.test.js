import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withServer } from '../test-support/start-server.js'

async function get(baseUrl, path, options) {
  const res = await fetch(baseUrl + path, options)
  return { res, body: await res.json() }
}

const ids = (invoices) => invoices.map((invoice) => invoice.id)

// P1
test('P1: GET /api/invoices sin filtros devuelve las 4 facturas, incluida la anulada', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /^application\/json/)
    assert.deepEqual(ids(body), ['F-1001', 'F-1002', 'F-1003', 'F-1004'])
    assert.deepEqual(Object.keys(body[0]).sort(), ['amount', 'client', 'id', 'issuedAt', 'status'])
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
    }))
}

// P3
test('P3: ?month=2026-08 devuelve solo F-1001 y F-1002', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?month=2026-08')
    assert.equal(res.status, 200)
    assert.deepEqual(ids(body), ['F-1001', 'F-1002'])
  }))

// P4
test('P4: ?status=open&month=2026-09 devuelve solo F-1004', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?status=open&month=2026-09')
    assert.equal(res.status, 200)
    assert.deepEqual(ids(body), ['F-1004'])
  }))

// P5
test('P5: ?status=&month= (vacíos) equivale a no filtrar', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices?status=&month=')
    assert.equal(res.status, 200)
    assert.deepEqual(ids(body), ['F-1001', 'F-1002', 'F-1003', 'F-1004'])
  }))

// P6
for (const [query, campo] of [
  ['status=pagada', 'status'],
  ['month=2026-13', 'month'],
]) {
  test(`P6: ?${query} responde 400 con un error legible y sin stack trace`, () =>
    withServer(async (baseUrl) => {
      const { res, body } = await get(baseUrl, `/api/invoices?${query}`)
      assert.equal(res.status, 400)
      assert.match(res.headers.get('content-type'), /^application\/json/)
      assert.deepEqual(Object.keys(body), ['error'])
      assert.equal(typeof body.error, 'string')
      assert.match(body.error, new RegExp(campo))
      assert.doesNotMatch(body.error, /\n\s+at /)
    }))
}

// P7
test('P7: una ruta desconocida responde 404 con JSON { error }', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/no-existe')
    assert.equal(res.status, 404)
    assert.match(res.headers.get('content-type'), /^application\/json/)
    assert.equal(typeof body.error, 'string')
  }))

test('P7: un método distinto de GET responde 405 con JSON { error }', () =>
  withServer(async (baseUrl) => {
    const { res, body } = await get(baseUrl, '/api/invoices', { method: 'POST' })
    assert.equal(res.status, 405)
    assert.match(res.headers.get('content-type'), /^application\/json/)
    assert.equal(typeof body.error, 'string')
  }))
