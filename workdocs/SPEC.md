# SPEC.md

Uno por equipo. Un extraño tiene que poder entenderlo sin el ticket abierto. Complétalo en M1. Grílalo en M2: el entregable es un diff en este archivo.

Ticket de origen: `tickets/T-01.md`. Dueña de las dudas: María (tesorería, Andes Lab).

## Problema

Tesorería de Andes Lab arma a mano, cada cierre de mes, el CSV de facturas que manda al banco: le toma cerca de una hora y se cuelan facturas anuladas que no deberían ir.

## Alcance

- Un comando nuevo en la CLI: `node src/cli.js export-csv [--month YYYY-MM] [--include-void] [--out <ruta>]`, en `src/cli.js`.
- Una función pura que serializa facturas a CSV, en un archivo nuevo (`src/csv.js`), que reutiliza `listInvoices()` de `src/invoices.js`.
- Tests de aceptación en `test/` con `node:test` (`npm test`), sobre el fixture `src/data/invoices.json`.

Formato del archivo:

- Encabezado: `id;cliente;fecha;monto;estado`.
- Separador `;`. **Supuesto:** Excel en Windows con configuración regional es-CL usa `;`; con `,` abre todo en una sola columna.
- Codificación UTF-8 **con BOM** (`EF BB BF`) para que Excel muestre bien los acentos. Fin de línea `\r\n`.
- `fecha` como `YYYY-MM-DD`, igual que en el JSON.
- `monto` como entero, sin símbolo ni separador de miles (`1250000`, no `$1.250.000`).
- `estado` con el valor del JSON (`paid`, `open`, `void`), sin traducir. **Supuesto.**
- Un campo con `;`, `"` o salto de línea va entre comillas dobles, y cada `"` interna se duplica (RFC 4180).
- Las filas salen en el mismo orden que el JSON.

Reglas:

- Por defecto se **excluyen** las facturas `void`. `--include-void` las incluye. **Supuesto:** María dice "las anuladas creo que no, o a veces sí para cuadrar".
- `--month YYYY-MM` filtra por `issuedAt`. Es opcional: sin el flag se exportan todos los meses.
- Sin `--out`, el archivo se llama `facturas.csv` y queda en el directorio actual. Con `--out` se escribe en esa ruta. Si ya existe, se sobrescribe. **Supuesto:** el ticket dice que el nombre "no quedó fijo".

## Aceptación observable

Cada criterio se escribe como test y falla antes de codear. Fixture: `src/data/invoices.json` (F-1001 y F-1002 de agosto, F-1003 `void` y F-1004 de septiembre).

1. `export-csv` sin flags crea `facturas.csv`. El archivo empieza con el BOM UTF-8 y su primera línea es `id;cliente;fecha;monto;estado`.
2. Sin flags, el archivo tiene 3 filas de datos: F-1001, F-1002 y F-1004. F-1003 (`void`) no aparece.
3. Con `--include-void`, aparecen las 4 facturas.
4. Con `--month 2026-08`, aparecen solo F-1001 y F-1002.
5. La fila de F-1001 es exactamente `F-1001;Constructora Sur;2026-08-02;1250000;paid`.
6. Todas las líneas terminan en `\r\n`.
7. Un cliente con `;` o `"` sale entre comillas y con la `"` interna duplicada (test unitario sobre `src/csv.js`).
8. Con `--out <ruta>`, el archivo se escribe en esa ruta y no se crea `facturas.csv`.
9. Con `--month` inválido (`2026-8`, `agosto`), el comando sale con código 1, escribe un mensaje en stderr y no crea ningún archivo.
10. Con un mes sin facturas (`--month 2025-01`), el archivo tiene solo el encabezado y el comando sale con código 0.
11. `list` y `get` no cambian: los tests actuales siguen pasando, incluido "the listing still includes voided invoices".

## Fuera de alcance

- Endpoint HTTP, login, interfaz gráfica y despliegue a producción.
- Exportar a `.xlsx` o a cualquier formato que no sea CSV.
- Enviar el archivo al banco o ajustarlo al formato de un banco específico.
- Otros filtros: por cliente, por estado distinto de `void` o por rango de fechas.
- Formatear montos como moneda (`$1.250.000`) o traducir los estados.
- Cambiar el comportamiento de `list` y `get`, o modificar `src/data/invoices.json`.
- Generar el nombre del archivo a partir del mes (`export-tesoreria-agosto.csv`): se cubre con `--out`.
