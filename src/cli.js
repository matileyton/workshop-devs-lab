import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { buildExport } from './export.js'
import { getInvoice, listInvoices } from './invoices.js'

function printInvoice(invoice) {
  console.log(
    [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, invoice.status].join('\t'),
  )
}

const [, , command, arg] = process.argv

if (command === 'list') {
  for (const invoice of listInvoices()) {
    printInvoice(invoice)
  }
  process.exit(0)
}

if (command === 'get') {
  if (!arg) {
    console.error('usage: node src/cli.js get <id>')
    process.exit(1)
  }
  const invoice = getInvoice(arg)
  if (!invoice) {
    console.error(`not found: ${arg}`)
    process.exit(1)
  }
  printInvoice(invoice)
  process.exit(0)
}

if (command === 'export-csv') {
  // Flags declarados para las stories 2 y 3; la story 1 aún no los usa.
  parseArgs({
    args: process.argv.slice(3),
    options: {
      month: { type: 'string' },
      'include-void': { type: 'boolean' },
      out: { type: 'string' },
    },
  })
  writeFileSync('facturas.csv', buildExport())
  process.exit(0)
}

console.error('usage: node src/cli.js <list|get|export-csv> [id]')
process.exit(1)
