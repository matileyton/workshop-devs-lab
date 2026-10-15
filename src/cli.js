import { parseArgs } from 'node:util'
import { buildExport } from './export.js'
import { getInvoice, listInvoices } from './invoices.js'
import { isValidMonth } from './month.js'
import { writeCsv } from './output.js'

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
  let parsed
  try {
    parsed = parseArgs({
      args: process.argv.slice(3),
      options: {
        month: { type: 'string' },
        'include-void': { type: 'boolean' },
        out: { type: 'string' },
      },
    })
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  const { values } = parsed
  if (values.month !== undefined && !isValidMonth(values.month)) {
    console.error(`invalid --month: ${values.month} (expected YYYY-MM, e.g. 2026-08)`)
    process.exit(1)
  }
  try {
    writeCsv(
      values.out ?? 'facturas.csv',
      buildExport({ month: values.month, includeVoid: values['include-void'] }),
    )
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  process.exit(0)
}

console.error('usage: node src/cli.js <list|get|export-csv> [id]')
process.exit(1)
