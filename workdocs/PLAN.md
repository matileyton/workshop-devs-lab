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

### Story 4: `feat/T-01-story-4`

**Persona:** Matías Leyton (`matileyton`).

**Hallazgo (caso que María no dijo):** una factura con `amount` ausente, `null`, `NaN` o escrito como texto (`"1.250.000"`) pasa al CSV sin error. Con `toCsv` de hoy salen `F-2001;Acme;2026-08-05;;open`, `...;NaN;paid` y `...;1.250.000;open`: al banco llega una fila sin monto, con `NaN` o con un monto que no es número. Eso rompe lo que dice la SPEC (monto como entero) y el dolor original del ticket (filas que no deberían ir).

**Qué entra:** `toCsv` valida el monto de cada factura. Si no es un número finito, falla con un error que nombra el id de la factura. El comando sale con código 1, mensaje legible en stderr y sin crear archivo.

**Diseño técnico (qué toca, contratos, orden):**

1. En `src/csv.js`, validar `Number.isFinite(invoice.amount)` (y que sea de tipo `number`) antes de armar cada fila. Si falla, lanzar `Error` con el id: `factura <id>: monto inválido (<valor>)`.
2. `src/cli.js` no cambia: ya captura el error de `buildExport`, lo imprime y sale con 1. `buildExport` se evalúa antes de `writeCsv`, así que no queda archivo.
3. Tests en `test/export-monto.test.js`: unitarios sobre `toCsv` y un caso de CLI sobre una copia temporal de `src/` con un JSON de datos malos, sin tocar `src/data/invoices.json`.

**Contratos que cambian:** `toCsv(invoices)` ahora lanza si un monto no es un número finito. El comando `export-csv` agrega un caso de error (código 1). El formato del CSV válido no cambia.

**Test de aceptación (falla antes de codear):** `test/export-monto.test.js`, criterio 17. Ejemplo: una factura con `amount: null` hace que `export-csv` salga con código 1, nombre el id en stderr y no cree `facturas.csv`.

### T-02 Story 1: `feat/T-02-story-1`

**Persona:** Juan.

**Ticket:** `tickets/T-02.md`.

**Qué entra:** Un test de aceptación que cubre eñes y tildes en el CSV, con UTF-8 con BOM y separador `;`. No cambia el formato del archivo.

**Diseño técnico (qué toca, contratos, orden):**

1. Crear `test/export-encoding.test.js`: arma una factura en el propio test con cliente `Compañía Ñuñoa Ltda. — Peñalolén` (sin tocar `src/data/invoices.json`), la pasa por `toCsv` (`src/csv.js`) y la escribe con `writeCsv` (`src/output.js`) en un directorio temporal (`fs.mkdtempSync`).
2. Leer el archivo como `Buffer` y asertar: los 3 primeros bytes son `EF BB BF`; contiene los bytes `C3 B1` (`ñ`) y `C3 91` (`Ñ`); decodificado en UTF-8, la fila de datos tiene 5 campos al separar por `;` y el segundo es el cliente exacto.
3. Si el test falla, el arreglo va en `src/csv.js` o `src/output.js` (por ejemplo, fijar `'utf8'` en `writeFileSync`). Si pasa sin cambios de código, se anota en `status.md` como test de caracterización, no como rojo.

**Contratos que cambian:** ninguno.

**Test de aceptación:** `test/export-encoding.test.js`, criterio 15.

## T-02-panel: Panel de facturas

Ticket: `tickets/T-02-panel.md`. Spec: sección "T-02-panel" de `workdocs/SPEC.md` (criterios `P1` a `P18`). Ramas `feat/T-02-panel-story-<n>`, un worktree y un PR por persona. Las tres stories parten de `main`.

Diseño común: `src/server.js` (story 1) arma un servidor `node:http` con una tabla de rutas. Los handlers tienen la firma `(req, res, url) => void`. Para que las stories 2 y 3 no editen los mismos archivos, la story 1 deja registrados los tres handlers, y los de las stories 2 y 3 nacen como stubs que responden `501`. Cada story reemplaza solo su archivo. Los tests de servidor usan el helper `test-support/start-server.js` (puerto `0`), que crea la story 1.

### T-02-panel Story 1: `feat/T-02-panel-story-1` (API)

**Persona:** Matías Leyton (`matileyton`).

**Qué entra:** El servidor, `GET /api/invoices` con filtros, los errores 400, 404 y 405, y los stubs de las otras dos rutas. Cubre P1 a P7.

**Diseño técnico (qué toca, contratos, orden):**

1. Crear `src/filters.js` con `parseFilters(searchParams)` (devuelve `{ status, month }`, trata el vacío como sin filtro y lanza un error con mensaje legible si `status` no es `paid|open|void` o el mes no pasa `isValidMonth`) y `filterInvoices(invoices, { status, month })`.
2. Crear `src/server.js` con `createApp()` (devuelve el `http.Server`), la tabla de rutas y las respuestas 404, 405 y 400 en JSON. Solo arranca `listen` en `PORT` (por defecto `3000`) si se ejecuta directo con `node src/server.js`. Agregar el script `start` a `package.json`.
3. Crear los stubs `src/page.js` (`handlePage`) y `src/export-route.js` (`handleExport`), que responden `501`, y el helper `test-support/start-server.js`.

**Contratos que cambian:** endpoint nuevo `GET /api/invoices?status=&month=`; módulos `parseFilters`, `filterInvoices` y `createApp`; script `npm start`. Las stories 2 y 3 importan `parseFilters` y `filterInvoices`.

**Test de aceptación (falla antes de codear):** `test/api.test.js`, criterios P1 a P7. Ejemplo: `fetch('/api/invoices?status=open&month=2026-09')` devuelve solo F-1004.

### T-02-panel Story 2: `feat/T-02-panel-story-2` (Página)

**Persona:** Antonia Urrutia.

**Qué entra:** El HTML de `GET /` con tabla, filtros, total y botón de descarga, la casilla "Incluir anuladas en el CSV" y las funciones `computeTotal`, `buildExportUrl` y `renderRows`. Cubre P8 a P10, P17 y P18.

**Diseño técnico (qué toca, contratos, orden):**

1. En `src/page.js`, exportar `computeTotal(invoices)`, `renderRows(invoices)` (filas `<tr>` con el HTML escapado) y `renderPage()` (string HTML con el JS en línea). El script incrusta `computeTotal` y `renderRows` con `.toString()`, así el test y la página usan las mismas funciones.
2. El JS de la página llama a `fetch('/api/invoices?status=&month=')`, rellena la tabla (con `renderRows`) y el total (con `computeTotal`), y arma el enlace del botón con `buildExportUrl({ status, month, includeVoid })` (función pura exportada, con test), que apunta a `/api/export.csv` con los mismos filtros y agrega `includeVoid=true` solo si la casilla está marcada. Si la API responde 400, escribe el `error` en `id="error"` y no toca la tabla. El campo de mes es `type="month"` con `pattern` y `placeholder="2026-08"`. Las etiquetas pagada, abierta y anulada se mapean a `paid`, `open` y `void` solo en la página.
3. Reemplazar el stub `handlePage` para responder 200 con `text/html; charset=utf-8`. No tocar `src/server.js`.

**Contratos que cambian:** `GET /` deja de responder 501; módulos `computeTotal(invoices) -> number`, `renderRows(invoices) -> string` y `buildExportUrl(options) -> string`.

**Test de aceptación (falla antes de codear):** `test/page.test.js`, criterios P8 a P10, P17 y P18. Ejemplo: `computeTotal` de las 4 facturas del fixture da `4690000`.

### T-02-panel Story 3: `feat/T-02-panel-story-3` (Descarga)

**Persona:** Juan.

**Qué entra:** `GET /api/export.csv` con los filtros, reutilizando el export de T-01, con el parámetro `includeVoid`. Cubre P11 a P14 y P16.

**Diseño técnico (qué toca, contratos, orden):**

1. En `src/export-route.js`, reemplazar el stub `handleExport`: usar `parseFilters` (400 JSON si es inválido) y leer `includeVoid` (`true`, `false` o vacío; cualquier otro valor da 400). Con `status` usa `toCsv(filterInvoices(listInvoices(), { status, month }))` e ignora `includeVoid`; sin `status` usa `buildExport({ month, includeVoid })`, que mantiene la regla de T-01 (sin anuladas salvo `includeVoid=true`).
2. Responder con `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="facturas.csv"`. Un error de `toCsv` (monto inválido) responde 500 con JSON legible, sin stack trace.
3. No tocar `src/server.js` ni `src/csv.js`.

**Contratos que cambian:** `GET /api/export.csv?status=&month=&includeVoid=` deja de responder 501. El formato del CSV no cambia.

**Test de aceptación (falla antes de codear):** `test/export-route.test.js`, criterios P11 a P14 y P16. Ejemplo: `?status=void` devuelve un CSV con F-1003 y sin las demás.

### Orden (T-02-panel)

1. Story 1 va primero: deja el servidor, los filtros, los stubs y el helper de tests. Las stories 2 y 3 parten de `main` después de su merge, y mientras tanto pueden escribir su test rojo.
2. Las stories 2 y 3 son independientes: cada una edita solo su archivo (`src/page.js` o `src/export-route.js`) y su test. Pueden mergear en cualquier orden. El único archivo compartido es `workdocs/status.md`, donde cada persona edita solo su fila.

## Orden

1. Story 1 va primero: crea `src/csv.js`, `src/export.js` y el comando en `src/cli.js`. Las otras dos parten de `main` después de su merge.
2. Story 2 y story 3 no comparten archivos nuevos ni de test, pero las dos editan `src/export.js` y `src/cli.js` en bloques distintos. Van en este orden: story 2, luego story 3. Quien mergea segundo resuelve el conflicto de esos dos archivos.
3. Mientras story 1 no esté en `main`, las stories 2 y 3 pueden escribir su test rojo, pero no su código.
4. Story 4 parte de `main` con las 3 stories mergeadas. Toca `src/csv.js` (no lo editan las demás) y agrega su propio test. No hay conflicto con otras stories.
