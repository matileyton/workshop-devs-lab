import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { toCsv } from '../src/csv.js'

const srcPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

function invoice(overrides) {
  return { id: 'F-2001', client: 'Acme', issuedAt: '2026-08-05', amount: 1000, status: 'open', ...overrides }
}

// Corre export-csv sobre una copia de src/ con datos propios (el fixture real no se toca).
function runWithData(invoices) {
  const root = mkdtempSync(join(tmpdir(), 'export-monto-'))
  cpSync(srcPath, join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'data', 'invoices.json'), JSON.stringify(invoices))
  const cwd = mkdtempSync(join(tmpdir(), 'export-monto-cwd-'))
  const result = spawnSync(process.execPath, [join(root, 'src', 'cli.js'), 'export-csv'], {
    cwd,
    encoding: 'utf8',
  })
  return { ...result, cwd }
}

const invalidAmounts = [
  ['null', { amount: null }],
  ['ausente', { amount: undefined }],
  ['NaN', { amount: Number.NaN }],
  ['texto con puntos', { amount: '1.250.000' }],
]

// Criterio 15, unitario sobre src/csv.js: el error nombra la factura y habla del monto.
for (const [label, overrides] of invalidAmounts) {
  test(`criterio 15: toCsv rechaza un monto ${label} y nombra la factura`, () => {
    assert.throws(() => toCsv([invoice(overrides)]), (error) => /F-2001/.test(error.message) && /monto/i.test(error.message))
  })
}

test('criterio 15: un monto 0 sigue siendo válido', () => {
  assert.match(toCsv([invoice({ amount: 0 })]), /F-2001;Acme;2026-08-05;0;open\r\n/)
})

// Criterio 15, por CLI: sale con 1, mensaje legible, sin stack trace y sin archivo.
// JSON no tiene NaN ni undefined: NaN se manda como texto y "ausente" omitiendo la clave.
for (const [label, overrides] of [
  ['null', { amount: null }],
  ['ausente', {}],
  ['texto con puntos', { amount: '1.250.000' }],
]) {
  test(`criterio 15: export-csv con monto ${label} sale con 1 y no crea archivo`, () => {
    const data = invoice(overrides)
    if (label === 'ausente') delete data.amount
    const { status, stderr, cwd } = runWithData([data])
    assert.equal(status, 1)
    assert.match(stderr, /F-2001/)
    assert.match(stderr, /monto/i)
    assert.doesNotMatch(stderr, /\n\s+at /)
    assert.deepEqual(readdirSync(cwd), [])
  })
}

test('criterio 15: export-csv con monto 0 exporta y sale con 0', () => {
  const { status, stderr, cwd } = runWithData([invoice({ amount: 0 })])
  assert.equal(status, 0, stderr)
  assert.equal(existsSync(join(cwd, 'facturas.csv')), true)
  assert.match(readFileSync(join(cwd, 'facturas.csv'), 'utf8'), /F-2001;Acme;2026-08-05;0;open\r\n/)
})
