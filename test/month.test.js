import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterByMonth } from '../src/month.js'

// Criterio 16 de workdocs/SPEC.md: una factura cuyo issuedAt está ausente o no es
// un string no pertenece a ningún mes. --month la omite y el resto de la
// exportación sigue normal: un dato malo no puede voltear la exportación completa.
//
// Unitario a propósito: el fixture src/data/invoices.json está limpio y modificarlo
// es fuera de alcance, así que el test construye sus propias facturas.

const AGOSTO = {
  id: 'F-1001',
  client: 'Constructora Sur',
  issuedAt: '2026-08-02',
  amount: 1250000,
  status: 'paid',
}

const SEPTIEMBRE = {
  id: 'F-1004',
  client: 'Taller Norte',
  issuedAt: '2026-09-08',
  amount: 450000,
  status: 'open',
}

function sinFecha(issuedAt) {
  return { id: 'F-1005', client: 'Minera Pacífico', issuedAt, amount: 300000, status: 'open' }
}

for (const [nombre, issuedAt] of [
  ['null', null],
  ['ausente (undefined)', undefined],
  ['numérico', 1754092800000],
  ['un objeto', {}],
]) {
  test(`criterio 16: issuedAt ${nombre} se omite sin voltear la exportación`, () => {
    const invoices = [AGOSTO, sinFecha(issuedAt), SEPTIEMBRE]

    // Lo que importa no es solo que F-1005 quede fuera: es que F-1001, que sí tiene
    // fecha de agosto, siga saliendo. Antes del arreglo filterByMonth lanzaba y se
    // perdían las dos.
    const filtradas = filterByMonth(invoices, '2026-08')

    assert.deepEqual(
      filtradas.map((invoice) => invoice.id),
      ['F-1001'],
    )
  })
}

test('criterio 16: un issuedAt string sigue filtrando igual que antes', () => {
  const invoices = [AGOSTO, SEPTIEMBRE, sinFecha('')]

  assert.deepEqual(
    filterByMonth(invoices, '2026-09').map((invoice) => invoice.id),
    ['F-1004'],
  )
  assert.deepEqual(filterByMonth(invoices, '2025-01'), [])
})
