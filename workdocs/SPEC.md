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
- Un campo de texto que empieza con `=`, `+`, `-`, `@`, tabulación o `\r` se prefija con `'` para que Excel no lo interprete como fórmula (CWE-1236). Aplica a `id`, `cliente`, `fecha` y `estado`; `monto` es número y no se toca. Agregado tras la revisión de seguridad del PR de la story 1.
- Un campo ausente (`null` o `undefined`) sale vacío.
- Las filas salen en el mismo orden que el JSON.

Reglas:

- Por defecto se **excluyen** las facturas `void`: lo seguro es no mandar anuladas al banco. `--include-void` las incluye, para cuando tesorería necesite cuadrar. Decidido en el grill; María lo confirma (ver "Fuera").
- `--month YYYY-MM` filtra por `issuedAt`. Es opcional: sin el flag se exportan todos los meses. Es válido solo con año de 4 dígitos y mes `01` a `12` (`^\d{4}-(0[1-9]|1[0-2])$`); cualquier otro valor es un error.
- Una factura cuyo `issuedAt` está ausente (`null` o `undefined`) o no es un string **no pertenece a ningún mes**: `--month` la omite y el resto de la exportación sigue normal. Sin `--month` se exporta igual, con la fecha vacía (ver "Formato del archivo"). Un dato malo no puede voltear la exportación completa. **Supuesto:** María lo confirma (ver "Preguntas abiertas").
- Sin `--out`, el archivo se llama `facturas.csv` y queda en el directorio actual. Con `--out` se escribe en esa ruta, y no se crean carpetas: si el directorio no existe o no se puede escribir, es un error. Si ya existe, se sobrescribe sin avisar (decidido en el grill: para conservar uno anterior está `--out`). **Supuesto:** el ticket dice que el nombre "no quedó fijo".

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
9. Con `--month` inválido (`2026-8`, `agosto`, `2026-13`, `2026-00`), el comando sale con código 1, escribe un mensaje en stderr y no crea ningún archivo.
10. Con un mes sin facturas (`--month 2025-01`), el archivo tiene solo el encabezado y el comando sale con código 0.
11. `list` y `get` no cambian: los tests actuales siguen pasando, incluido "the listing still includes voided invoices".
12. Con `--out` en un directorio que no existe (por ejemplo `no-existe/x.csv`), el comando sale con código 1, escribe un mensaje legible en stderr (no un stack trace) y no crea la carpeta ni el archivo.
13. Un cliente que empieza con `=`, `+`, `-`, `@`, tabulación o `\r` sale con `'` al inicio (por ejemplo `'=SUMA(A1)`), y un cliente normal no cambia (test unitario sobre `src/csv.js`).
14. Con un flag desconocido (por ejemplo `--mes`), el comando sale con código 1, escribe un mensaje legible en stderr (no un stack trace) y no crea ningún archivo.
15. Un cliente con eñes y tildes (por ejemplo `Compañía Ñuñoa Ltda. — Peñalolén`) escrito con `toCsv` y `writeCsv` deja un archivo que empieza con los bytes `EF BB BF`, guarda `ñ` como `C3 B1` y `Ñ` como `C3 91` (UTF-8, no Latin-1), y su fila tiene 5 campos separados por `;` con el cliente intacto. Ticket de origen: `tickets/T-02.md`.
16. `filterByMonth` omite las facturas sin `issuedAt` usable (`null`, `undefined` o un valor que no es string) y devuelve las del mes pedido, sin lanzar (test unitario sobre `src/month.js`). El fixture no se toca: el test construye sus propias facturas. Ticket de origen: `tickets/T-01.md`.
17. Una factura con `amount` ausente, `null`, `NaN` o escrito como texto (por ejemplo `"1.250.000"`) no llega al CSV: `toCsv` lanza un error que nombra el id de la factura, y `export-csv` sale con código 1, escribe un mensaje legible en stderr (no un stack trace) y no crea ningún archivo. Un monto `0` sigue siendo válido.

## Fuera de alcance

- Endpoint HTTP, login, interfaz gráfica y despliegue a producción.
- Exportar a `.xlsx` o a cualquier formato que no sea CSV.
- Enviar el archivo al banco o ajustarlo al formato de un banco específico.
- Otros filtros: por cliente, por estado distinto de `void` o por rango de fechas.
- Formatear montos como moneda (`$1.250.000`) o traducir los estados.
- Cambiar el comportamiento de `list` y `get`, o modificar `src/data/invoices.json`.
- Elegir el separador (`--delimiter`): el CSV sale siempre con `;`.
- Generar el nombre del archivo a partir del mes (`export-tesoreria-agosto.csv`): se cubre con `--out`.

Preguntas abiertas (responde María, dueña del ticket):

- ¿El Excel de tesorería usa `;` o `,` como separador? Si usa `,`, hay que reabrir `--delimiter`.
- ¿Las facturas `void` se excluyen por defecto, y en qué casos tesorería las necesita "para cuadrar"? Mientras tanto rige lo del grill: se excluyen, con `--include-void`.
- Una factura sin `issuedAt`, ¿se omite en silencio del mes filtrado o tesorería necesita verla señalada? Mientras tanto se omite, porque hoy el filtro se cae con un `TypeError` y voltea la exportación entera.


---

## T-02-panel: Panel de facturas para María

Ticket de origen: `tickets/T-02-panel.md`. Dueña de las dudas: María (tesorería, Andes Lab). Los criterios de esta sección se numeran `P1` a `P18` para no chocar con los de T-01 y T-02.

### Problema

María revisa las facturas en la terminal (`node src/cli.js list`) antes de mandar el CSV al banco y no le gusta: quiere verlas, filtrarlas y bajar el CSV desde el navegador.

### Alcance

- `src/server.js`: servidor con `node:http`, sin dependencias nuevas. Escucha en `http://localhost:3000` (configurable con la variable `PORT`; los tests usan un puerto libre). Se levanta con `node src/server.js` y `npm start`.
- `GET /api/invoices?status=&month=`: JSON con las facturas filtradas (`src/filters.js`).
- `GET /`: un solo HTML con su JS en línea (`src/page.js`; las filas se arman con `renderRows`, que escapa el HTML): tabla con id, cliente, fecha, monto y estado; filtros por estado y por mes; total de lo que se ve; casilla "Incluir anuladas en el CSV" (desmarcada por defecto); botón "Descargar CSV".
- `GET /api/export.csv?status=&month=`: el CSV de T-01 con los filtros aplicados y, con `includeVoid=true`, con las anuladas incluidas (`src/export-route.js`, reutiliza `toCsv` y `buildExport`).
- Los datos salen de `src/data/invoices.json` a través de `src/invoices.js`, que no se modifica.
- Tests en `test/` con `node:test` y `fetch`, levantando el servidor en un puerto libre (puerto `0`).

Reglas y supuestos:

- En la API el estado se pide con los valores del JSON: `paid`, `open` o `void`. La página los muestra como pagada, abierta y anulada.
- El mes usa la regla de T-01 (`isValidMonth` de `src/month.js`): `YYYY-MM` con mes `01` a `12`.
- Un parámetro vacío (`?status=&month=`) equivale a no filtrar.
- El campo de mes de la página es `<input type="month">`. En navegadores que lo muestran como texto (Firefox de escritorio), el `pattern` y el `placeholder` guían a María. Si la API responde 400, la página muestra el mensaje de `error` en un área propia (`id="error"`) y deja la tabla como estaba.
- **Supuesto:** la tabla sin filtro de estado muestra todas las facturas, incluidas las anuladas, y el total suma lo que se ve.
- El CSV excluye las `void` por defecto, como en T-01. Con `includeVoid=true` las incluye. `status` manda: con `status=void` salen solo las anuladas, y con `status=paid` solo las pagadas aunque venga `includeVoid=true`. Decidido en el grill: la casilla de la página elige si se descarga con o sin anuladas. `includeVoid` solo se acepta como `true` o `false`; la API de `/api/invoices` lo ignora.

### Aceptación observable

Cada criterio se escribe como test y falla antes de codear. Fixture: `src/data/invoices.json` (F-1001 pagada y F-1002 abierta de agosto; F-1003 anulada y F-1004 abierta de septiembre).

API (story 1):

P1. `GET /api/invoices` sin filtros responde 200 con `Content-Type: application/json` y un arreglo con las 4 facturas (F-1001 a F-1004, incluida la anulada), cada una con `id`, `client`, `issuedAt`, `amount` y `status`.
P2. `?status=paid` devuelve solo F-1001; `?status=open`, F-1002 y F-1004; `?status=void`, F-1003.
P3. `?month=2026-08` devuelve solo F-1001 y F-1002.
P4. `?status=open&month=2026-09` devuelve solo F-1004.
P5. `?status=&month=` (vacíos) devuelve las 4 facturas, igual que sin filtros.
P6. `?status=pagada` o `?month=2026-13` responde 400 con JSON `{ "error": "<mensaje legible>" }` y sin stack trace.
P7. Una ruta desconocida responde 404 con JSON `{ "error": ... }`, y un método distinto de `GET` responde 405.

Página (story 2):

P8. `GET /` responde 200 con `Content-Type: text/html; charset=utf-8`. El HTML trae una tabla con las columnas id, cliente, fecha, monto y estado, un selector de estado (todos, pagada, abierta, anulada), un campo de mes (`type="month"`, con `pattern="\d{4}-(0[1-9]|1[0-2])"` y `placeholder="2026-08"`), un área de error (`id="error"`), el elemento del total, la casilla "Incluir anuladas en el CSV" y el botón "Descargar CSV".
P9. `computeTotal(invoices)` en `src/page.js` suma los `amount`: `[]` da `0`, las 4 facturas del fixture dan `4690000` y solo las pagadas dan `1250000` (test unitario).
P10. El HTML no carga nada externo: ningún `src` ni `href` que empiece con `http`, y la función `computeTotal` del HTML es la misma que prueba el test.
P18. `renderRows(invoices)` en `src/page.js` devuelve una fila `<tr>` con 5 celdas (id, cliente, fecha, monto, estado) por factura, y `''` para `[]`. Un cliente con `<script>alert(1)</script>` o `&` sale escapado (`&lt;script&gt;`, `&amp;`) y el resultado no contiene `<script>` (test unitario). La función incrustada en el HTML es la misma que prueba el test.

Descarga (story 3):

P11. `GET /api/export.csv` sin filtros responde 200 con `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="facturas.csv"`. El cuerpo es idéntico al de `buildExport()` de T-01: BOM, encabezado `id;cliente;fecha;monto;estado` y líneas con `\r\n`.
P12. Con filtros: `?status=void` trae solo F-1003, `?month=2026-08` trae F-1001 y F-1002, y `?status=open&month=2026-09` trae solo F-1004.
P13. Sin filtro de estado y sin `includeVoid`, F-1003 (`void`) no aparece, como en T-01.
P14. Con un filtro inválido (`?status=pagada`, `?month=2026-13`, `?includeVoid=quizás`) responde 400 con el mismo JSON de P6 y sin `Content-Disposition`.

Casilla de anuladas (stories 3 y 2):

P16. `GET /api/export.csv?includeVoid=true` trae las 4 facturas, incluida F-1003; `?includeVoid=true&month=2026-09` trae F-1003 y F-1004; `?includeVoid=false` equivale a no mandarlo (sin F-1003); y `?status=paid&includeVoid=true` trae solo F-1001.
P17. `buildExportUrl({ status, month, includeVoid })` en `src/page.js` devuelve `/api/export.csv` con solo los filtros que no están vacíos, y agrega `includeVoid=true` solo cuando `includeVoid` es verdadero. Por ejemplo, `{ status: '', month: '2026-08', includeVoid: false }` da `/api/export.csv?month=2026-08` (test unitario).

General:

P15. `npm test` queda en verde, con los tests de T-01 y T-02 intactos. `node src/cli.js` se comporta igual que antes y `package.json` no agrega `dependencies`.

### Fuera de alcance

- Login, base de datos, deploy y frameworks de front.
- Dependencias nuevas (nada de `npm install`).
- Los extras de la story 4: monto en pesos chilenos con formato, anuladas en gris y búsqueda por cliente. Este equipo es de 3 personas.
- Paginación, ordenar columnas, editar facturas y HTTPS.
- Cambiar el comando `export-csv` de la CLI o el fixture `src/data/invoices.json`.

Preguntas abiertas (responde María, dueña del ticket):

- ¿La tabla sin filtro debe mostrar las facturas anuladas y sumarlas al total, o debe ocultarlas?
- ¿La casilla "Incluir anuladas en el CSV" debe venir desmarcada por defecto (como T-01)? Mientras tanto rige lo del grill: desmarcada.
