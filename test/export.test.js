import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const CLI = path.resolve('src/cli.js')
const BOM = '﻿'

function runExport() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'export-csv-'))
  const result = spawnSync(process.execPath, [CLI, 'export-csv'], { cwd, encoding: 'utf8' })
  const file = path.join(cwd, 'facturas.csv')
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
  return { result, content }
}

test('criterio 1: crea facturas.csv con BOM y encabezado', () => {
  const { result, content } = runExport()
  assert.equal(result.status, 0, result.stderr)
  assert.notEqual(content, null, 'facturas.csv no existe')
  assert.ok(content.startsWith(BOM), 'falta el BOM')
  assert.equal(content.slice(1).split('\r\n')[0], 'id;cliente;fecha;monto;estado')
})

test('criterio 2: excluye las facturas void por defecto', () => {
  const { content } = runExport()
  assert.notEqual(content, null, 'facturas.csv no existe')
  const rows = content.slice(1).split('\r\n').slice(1).filter(Boolean)
  assert.deepEqual(
    rows.map((row) => row.split(';')[0]),
    ['F-1001', 'F-1002', 'F-1004'],
  )
  assert.ok(!content.includes('F-1003'))
})

test('criterio 5: formato exacto de la fila de F-1001', () => {
  const { content } = runExport()
  assert.notEqual(content, null, 'facturas.csv no existe')
  assert.ok(content.includes('\r\nF-1001;Constructora Sur;2026-08-02;1250000;paid\r\n'))
})

test('criterio 6: todas las líneas terminan en \\r\\n', () => {
  const { content } = runExport()
  assert.notEqual(content, null, 'facturas.csv no existe')
  assert.ok(content.endsWith('\r\n'))
  assert.ok(!/(^|[^\r])\n/.test(content), 'hay un \\n sin \\r')
})

test('criterio 7: escapa campos con ; y " (RFC 4180)', async () => {
  const { toCsv } = await import('../src/csv.js')
  const csv = toCsv([
    { id: 'F-1', client: 'Ana; Hijos', issuedAt: '2026-08-01', amount: 1, status: 'paid' },
    { id: 'F-2', client: 'El "Gran" Taller', issuedAt: '2026-08-02', amount: 2, status: 'open' },
  ])
  assert.ok(csv.includes('F-1;"Ana; Hijos";2026-08-01;1;paid\r\n'))
  assert.ok(csv.includes('F-2;"El ""Gran"" Taller";2026-08-02;2;open\r\n'))
})
