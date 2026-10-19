import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildExport } from '../src/export.js'
import { withServer } from '../test-support/start-server.js'

const BOM = '﻿'
const NO_STACK = /\bat\s+\S+.*:\d+:\d+/

// res.text() descarta el BOM al decodificar: se leen los bytes y se decodifica conservándolo.
async function getCsv(baseUrl, path) {
  const res = await fetch(baseUrl + path)
  const bytes = Buffer.from(await res.arrayBuffer())
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  return { res, bytes, text }
}

// Ids de las filas de datos: sin BOM, sin encabezado, primer campo de cada línea.
function csvIds(text) {
  const lines = text.replace(BOM, '').split('\r\n').filter((line) => line !== '')
  return lines.slice(1).map((line) => line.split(';')[0])
}

function assertCsvResponse(res) {
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8')
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="facturas.csv"')
}

// P11
test('P11: GET /api/export.csv sin filtros es el CSV de T-01 como descarga', () =>
  withServer(async (baseUrl) => {
    const { res, bytes, text } = await getCsv(baseUrl, '/api/export.csv')
    assertCsvResponse(res)
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'el CSV tiene que empezar con el BOM')
    assert.ok(text.startsWith(`${BOM}id;cliente;fecha;monto;estado\r\n`))
    assert.equal(text, buildExport())
  }))

// P12
for (const [query, expected] of [
  ['?status=void', ['F-1003']],
  ['?month=2026-08', ['F-1001', 'F-1002']],
  ['?status=open&month=2026-09', ['F-1004']],
]) {
  test(`P12: ${query} trae ${expected.join(' y ')}`, () =>
    withServer(async (baseUrl) => {
      const { res, text } = await getCsv(baseUrl, `/api/export.csv${query}`)
      assertCsvResponse(res)
      assert.deepEqual(csvIds(text), expected)
    }))
}

// P13
test('P13: sin filtro de estado ni includeVoid, F-1003 (void) no aparece', () =>
  withServer(async (baseUrl) => {
    const { res, text } = await getCsv(baseUrl, '/api/export.csv')
    assertCsvResponse(res)
    assert.deepEqual(csvIds(text), ['F-1001', 'F-1002', 'F-1004'])
  }))

// P14
for (const query of ['?status=pagada', '?month=2026-13', '?includeVoid=quizás']) {
  test(`P14: ${query} responde 400 JSON sin Content-Disposition`, () =>
    withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/export.csv${query}`)
      assert.equal(res.status, 400)
      assert.match(res.headers.get('content-type'), /^application\/json/)
      assert.equal(res.headers.get('content-disposition'), null)
      const body = await res.json()
      assert.deepEqual(Object.keys(body), ['error'])
      assert.equal(typeof body.error, 'string')
      assert.ok(body.error.length > 0, 'el mensaje de error no puede estar vacío')
      assert.doesNotMatch(body.error, NO_STACK)
    }))
}

// P16
for (const [query, expected] of [
  ['?includeVoid=true', ['F-1001', 'F-1002', 'F-1003', 'F-1004']],
  ['?includeVoid=true&month=2026-09', ['F-1003', 'F-1004']],
  ['?includeVoid=false', ['F-1001', 'F-1002', 'F-1004']],
  ['?includeVoid=', ['F-1001', 'F-1002', 'F-1004']],
  ['?status=paid&includeVoid=true', ['F-1001']],
]) {
  test(`P16: ${query} trae ${expected.join(', ')}`, () =>
    withServer(async (baseUrl) => {
      const { res, text } = await getCsv(baseUrl, `/api/export.csv${query}`)
      assertCsvResponse(res)
      assert.deepEqual(csvIds(text), expected)
    }))
}
