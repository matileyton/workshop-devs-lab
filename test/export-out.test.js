import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const cliPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js')

function runExport(args) {
  const cwd = mkdtempSync(join(tmpdir(), 'export-out-'))
  const result = spawnSync(process.execPath, [cliPath, 'export-csv', ...args], {
    cwd,
    encoding: 'utf8',
  })
  return { ...result, cwd }
}

function dataIds(csv) {
  return csv
    .replace(/^﻿/, '')
    .split('\r\n')
    .slice(1)
    .filter((line) => line !== '')
    .map((line) => line.split(';')[0])
}

// Criterio 3
test('--include-void exports all 4 invoices, including F-1003', () => {
  const { status, stderr, cwd } = runExport(['--include-void'])
  assert.equal(status, 0, stderr)
  const csv = readFileSync(join(cwd, 'facturas.csv'), 'utf8')
  assert.deepEqual(dataIds(csv), ['F-1001', 'F-1002', 'F-1003', 'F-1004'])
})

// Criterio 8
test('--out writes to that path and does not create facturas.csv', () => {
  const { status, stderr, cwd } = runExport(['--out', 'agosto.csv'])
  assert.equal(status, 0, stderr)
  assert.ok(existsSync(join(cwd, 'agosto.csv')), 'agosto.csv was not created')
  assert.equal(existsSync(join(cwd, 'facturas.csv')), false)
})

// Criterio 12
test('--out into a missing directory exits 1 with a readable error and creates nothing', () => {
  const { status, stderr, cwd } = runExport(['--out', 'no-existe/x.csv'])
  assert.equal(status, 1)
  assert.notEqual(stderr.trim(), '', 'stderr should explain the error')
  assert.doesNotMatch(stderr, /^\s+at /m, 'stderr should not contain a stack trace')
  assert.match(stderr, /no-existe/, 'stderr should name the path that failed')
  assert.equal(existsSync(join(cwd, 'no-existe')), false)
  assert.equal(existsSync(join(cwd, 'facturas.csv')), false)
})
