# PLAN.md

Uno por equipo. Derívalo en M3 con Plan Mode (`opusplan`, con Opus), después de grillar la spec. Haz commit a `main` antes de partir los worktrees.

El diseño técnico de cada story va aquí. No hay `DESIGN.md`.

Cada story tiene una persona, un worktree, una rama `feat/<ticket-id>-story-<n>` y un PR.

Equipo: `equipo1`. Ticket: `T-01`. Spec: `workdocs/SPEC.md` (los números de criterio de abajo son los de su "Aceptación observable").

Convención de tests: cada story escribe su propio archivo en `test/` (no editan el mismo). Los tests corren el CLI con `child_process` y `cwd` en un directorio temporal (`fs.mkdtempSync`), para no ensuciar el repo con `facturas.csv`.

## Stories

### Story 1: `feat/T-01-story-1`

**Persona:** Matías Leyton (`matileyton`).

**Qué entra:** El comando base `export-csv` sin flags de comportamiento: CSV con BOM, encabezado, `\r\n`, escape, exclusión de `void` por defecto y archivo `facturas.csv`. Deja armado el parseo de flags para que las stories 2 y 3 solo agreguen lógica.

**Diseño técnico (qué toca, contratos, orden):**

1. Crear `src/csv.js` con `toCsv(invoices)`: devuelve un string con BOM (`﻿`), encabezado `id;cliente;fecha;monto;estado`, una fila por factura, líneas terminadas en `\r\n`, y escape RFC 4180 de campos con `;`, `"` o salto de línea. Función pura, sin leer disco.
2. Crear `src/export.js` con `buildExport({ month, includeVoid } = {})`: llama `listInvoices()` (`src/invoices.js`, no se modifica), excluye `status === 'void'` y devuelve `toCsv(...)`. Las opciones `month` e `includeVoid` ya existen en la firma pero la story 1 no las usa.
3. En `src/cli.js`, agregar el comando `export-csv`: parsear flags con `parseArgs` de `node:util` (`--month`, `--include-void`, `--out`, todos declarados), llamar `buildExport` y escribir `facturas.csv` en el directorio actual. Sin tocar `list` ni `get`, y actualizar el mensaje de uso a `<list|get|export-csv>`.

**Contratos que cambian:** comando `node src/cli.js export-csv`; módulos nuevos `toCsv(invoices) -> string` y `buildExport(options) -> string`.

**Test de aceptación (falla antes de codear):** `test/export.test.js`, criterios 1, 2, 5, 6, 7, 11, 13 y 14. Ejemplo: `export-csv` sin flags crea `facturas.csv` que empieza con el BOM, cuya primera línea es `id;cliente;fecha;monto;estado` y que no contiene F-1003.

### Story 2: `feat/T-01-story-2`

**Persona:** Antonia Urrutia.

**Qué entra:** El filtro `--month YYYY-MM`, con su validación.

**Diseño técnico (qué toca, contratos, orden):**

1. Crear `src/month.js` con `isValidMonth(value)` (regex `^\d{4}-(0[1-9]|1[0-2])$`) y `filterByMonth(invoices, month)` (compara con `issuedAt.slice(0, 7)`).
2. En `src/export.js`, usar `filterByMonth` dentro de `buildExport` cuando llega `month`. Esta story edita solo ese bloque.
3. En `src/cli.js`, validar `--month` antes de escribir: si es inválido, mensaje en stderr, código 1 y ningún archivo. Con un mes sin facturas, el archivo trae solo el encabezado y el código es 0.

**Contratos que cambian:** flag `--month YYYY-MM` de `export-csv`; módulo nuevo `src/month.js` (`isValidMonth`, `filterByMonth`).

**Test de aceptación (falla antes de codear):** `test/export-month.test.js`, criterios 4, 9 y 10. Ejemplo: `--month 2026-08` devuelve solo F-1001 y F-1002; `--month 2026-13` sale con código 1 y no crea archivo.

### Story 3: `feat/T-01-story-3`

**Persona:** Juan.

**Qué entra:** Los flags `--include-void` y `--out <ruta>`, con el manejo de errores de la ruta.

**Diseño técnico (qué toca, contratos, orden):**

1. En `src/export.js`, hacer que `buildExport` respete `includeVoid: true` (no excluir `void`). Esta story edita solo ese filtro.
2. Crear `src/output.js` con `writeCsv(path, content)`: escribe el archivo (sobrescribe sin avisar), y si el directorio no existe o no se puede escribir, lanza un error con mensaje legible. No crea carpetas.
3. En `src/cli.js`, usar `--out` (por defecto `facturas.csv`) con `writeCsv`; ante el error, mensaje en stderr sin stack trace, código 1 y ningún archivo.

**Contratos que cambian:** flags `--include-void` y `--out <ruta>` de `export-csv`; módulo nuevo `src/output.js` (`writeCsv`).

**Test de aceptación (falla antes de codear):** `test/export-out.test.js`, criterios 3, 8 y 12. Ejemplo: `--out no-existe/x.csv` sale con código 1, con mensaje legible en stderr, sin crear la carpeta ni el archivo.

## Orden

1. Story 1 va primero: crea `src/csv.js`, `src/export.js` y el comando en `src/cli.js`. Las otras dos parten de `main` después de su merge.
2. Story 2 y story 3 no comparten archivos nuevos ni de test, pero las dos editan `src/export.js` y `src/cli.js` en bloques distintos. Van en este orden: story 2, luego story 3. Quien mergea segundo resuelve el conflicto de esos dos archivos.
3. Mientras story 1 no esté en `main`, las stories 2 y 3 pueden escribir su test rojo, pero no su código.
