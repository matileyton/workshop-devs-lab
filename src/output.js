import { writeFileSync } from 'node:fs'

const REASONS = {
  ENOENT: 'el directorio no existe',
  EACCES: 'sin permiso de escritura',
  EPERM: 'sin permiso de escritura',
  EISDIR: 'la ruta es un directorio',
}

// Sobrescribe sin avisar y no crea carpetas: si el directorio no existe o no se puede escribir, lanza un error legible.
export function writeCsv(path, content) {
  try {
    writeFileSync(path, content)
  } catch (error) {
    throw new Error(`no se pudo escribir ${path}: ${REASONS[error.code] ?? error.message}`)
  }
}
