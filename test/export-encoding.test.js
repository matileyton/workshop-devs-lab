import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { toCsv } from '../src/csv.js'
import { writeCsv } from '../src/output.js'

const CLIENT = 'Compañía Ñuñoa Ltda. — Peñalolén'

function writeInvoice() {
  const path = join(mkdtempSync(join(tmpdir(), 'export-encoding-')), 'facturas.csv')
  writeCsv(path, toCsv([{ id: 'F-9001', client: CLIENT, issuedAt: '2026-08-15', amount: 990000, status: 'paid' }]))
  return readFileSync(path)
}

// Criterio 15
test('criterio 15: the file starts with the UTF-8 BOM (EF BB BF)', () => {
  const bytes = writeInvoice()
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf])
})

// Criterio 15
test('criterio 15: ñ and Ñ are stored as UTF-8 (C3 B1, C3 91), not Latin-1', () => {
  const bytes = writeInvoice()
  assert.ok(bytes.includes(Buffer.from([0xc3, 0xb1])), 'ñ is not C3 B1')
  assert.ok(bytes.includes(Buffer.from([0xc3, 0x91])), 'Ñ is not C3 91')
  assert.ok(!bytes.includes(Buffer.from([0xf1])), 'found Latin-1 ñ (F1)')
  assert.ok(!bytes.includes(Buffer.from([0xd1])), 'found Latin-1 Ñ (D1)')
})

// Criterio 15
test('criterio 15: the data row has 5 fields split by ";" with the client intact', () => {
  const lines = writeInvoice().subarray(3).toString('utf8').split('\r\n')
  assert.equal(lines[0], 'id;cliente;fecha;monto;estado')
  const fields = lines[1].split(';')
  assert.equal(fields.length, 5)
  assert.equal(fields[1], CLIENT)
})
