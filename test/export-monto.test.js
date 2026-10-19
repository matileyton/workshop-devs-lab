import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { toCsv } from '../src/csv.js'

const srcPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

function invoice(overrides) {
  return { id: 'F-2001', client: 'Acme', issuedAt: '2026-08-05', amount: 1000, status: 'open', ...overrides }
}

// Criterio 15: montos que no son número (unitario sobre src/csv.js)
for (const [label, amount] of [
  ['null', null],
  ['ausente', undefined],
  ['NaN', Number.NaN],
  ['texto con puntos', '1.250.000'],
]) {
  test(`criterio 15: toCsv rechaza un monto ${label} y nombra la factura`, () => {
    assert.throws(() => toCsv([invoice({ amount })]), /F-2001/)
  })
}

test('criterio 15: un monto 0 sigue siendo válido', () => {
  assert.match(toCsv([invoice({ amount: 0 })]), /F-2001;Acme;2026-08-05;0;open\r\n/)
})

// Criterio 15: el comando, sobre una copia de src/ con datos malos (el fixture real no se toca)
test('criterio 15: export-csv sale con 1, nombra la factura y no crea archivo', () => {
  const root = mkdtempSync(join(tmpdir(), 'export-monto-'))
  cpSync(srcPath, join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'data', 'invoices.json'), JSON.stringify([invoice({ amount: null })]))
  const cwd = mkdtempSync(join(tmpdir(), 'export-monto-cwd-'))
  const { status, stderr } = spawnSync(process.execPath, [join(root, 'src', 'cli.js'), 'export-csv'], {
    cwd,
    encoding: 'utf8',
  })
  assert.equal(status, 1)
  assert.match(stderr, /F-2001/)
  assert.doesNotMatch(stderr, /at .*\.js:\d+/)
  assert.equal(existsSync(join(cwd, 'facturas.csv')), false)
  assert.deepEqual(readdirSync(cwd), [])
})
