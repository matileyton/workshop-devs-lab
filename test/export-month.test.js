import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

// Story 2 de T-01: filtro --month YYYY-MM. Criterios 4, 9 y 10 de workdocs/SPEC.md.
// El CLI corre con cwd en un directorio temporal para no ensuciar el repo con facturas.csv.

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url))
const HEADER = 'id;cliente;fecha;monto;estado'

function runExport(args) {
  const cwd = mkdtempSync(join(tmpdir(), 'export-month-'))
  const result = spawnSync(process.execPath, [cli, 'export-csv', ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  })
  return { ...result, cwd, csvPath: join(cwd, 'facturas.csv') }
}

function readLines(csvPath) {
  const content = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '')
  return content.split('\r\n').filter((line) => line !== '')
}

// Criterio 4
test('--month 2026-08 exporta solo las facturas de agosto', () => {
  const { status, csvPath } = runExport(['--month', '2026-08'])
  assert.equal(status, 0)
  assert.ok(existsSync(csvPath), 'no se creó facturas.csv')

  const lines = readLines(csvPath)
  assert.equal(lines[0], HEADER)
  assert.deepEqual(lines.slice(1), [
    'F-1001;Constructora Sur;2026-08-02;1250000;paid',
    'F-1002;Servicios Andes;2026-08-15;890000;open',
  ])
})

// Criterio 9
for (const month of ['2026-8', 'agosto', '2026-13', '2026-00']) {
  test(`--month ${month} es inválido: código 1, stderr y ningún archivo`, () => {
    const { status, stderr, cwd } = runExport(['--month', month])
    assert.equal(status, 1)
    // El mensaje tiene que ser sobre el mes, no el usage de un comando desconocido.
    // La spec no fija el wording: sirve el valor inválido, "month" o "mes".
    assert.match(stderr, new RegExp(`${month}|month|mes`, 'i'))
    assert.deepEqual(readdirSync(cwd), [], 'creó algún archivo con un mes inválido')
  })
}

// Criterio 10
test('--month 2025-01 (sin facturas) deja solo el encabezado y sale con 0', () => {
  const { status, csvPath } = runExport(['--month', '2025-01'])
  assert.equal(status, 0)
  assert.ok(existsSync(csvPath), 'no se creó facturas.csv')
  assert.deepEqual(readLines(csvPath), [HEADER])
})
