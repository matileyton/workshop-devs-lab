# SPEC.md

Uno por equipo. Un extraño tiene que poder entenderlo sin el ticket abierto. Complétalo en M1. Grílalo en M2: el entregable es un diff en este archivo.

Ticket: [T-01: Exportar CSV de facturas para tesorería](../tickets/T-01.md)

## Problema

Tesorería arma a mano, copiando la salida de `node src/cli.js list` a una planilla, el CSV de facturas que manda al banco: cada cierre de mes toma ~una hora, se cuelan facturas anuladas que no deberían ir y Excel de Windows a veces muestra mal los acentos.

## Alcance

Al cerrar existe en el repo:

- Un comando nuevo `node src/cli.js export-csv` que escribe un CSV de facturas a partir de `src/data/invoices.json`.
- Flags opcionales:
  - `--out <ruta>`: ruta del archivo de salida. Por defecto `facturas.csv` en el directorio actual.
  - `--month AAAA-MM`: exporta solo facturas cuya `issuedAt` cae en ese mes. Sin el flag, exporta todos los meses.
  - `--include-void`: incluye facturas con estado `void`. Sin el flag, se excluyen.
- Formato del archivo:
  - Codificación UTF-8 con BOM (`EF BB BF`).
  - Separador `;` y fin de línea `\r\n`.
  - Encabezado `id;cliente;fecha;monto;estado`, mapeado desde `id`, `client`, `issuedAt`, `amount` y `status`.
  - Monto como entero sin `$` ni separador de miles. Fecha `AAAA-MM-DD`. Estado sin traducir (`paid`, `open`, `void`).
  - Campos con `;`, `"` o salto de línea van entre comillas dobles, con las comillas internas duplicadas (RFC 4180).
  - Filas en el mismo orden que `src/data/invoices.json` (el mismo de `list`).
- Si el archivo de salida ya existe, se sobrescribe sin preguntar.
- Tests de aceptación para los criterios de abajo.

## Aceptación observable

Datos de referencia (`src/data/invoices.json`): F-1001 (2026-08, paid), F-1002 (2026-08, open), F-1003 (2026-09, void), F-1004 (2026-09, open).

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-1 | los datos actuales, exista o no `facturas.csv` | `node src/cli.js export-csv` | exit 0 y queda `facturas.csv` en el directorio actual con el contenido nuevo |
| CA-2 | — | `export-csv --out export-tesoreria-agosto.csv` | el archivo se escribe en esa ruta |
| CA-3 | — | cualquier export | la primera línea (después del BOM) es `id;cliente;fecha;monto;estado` |
| CA-4 | F-1001 con monto 1250000 | se exporta | el campo monto es `1250000` (sin `$` ni puntos) |
| CA-5 | F-1001 | se exporta | el campo fecha es `2026-08-02` |
| CA-6 | F-1003 es `void` | `export-csv` sin flags | las filas son, en orden, F-1001, F-1002 y F-1004 (sin F-1003) |
| CA-7 | — | `export-csv --include-void` | las filas son, en orden, F-1001, F-1002, F-1003 (estado `void`) y F-1004 |
| CA-8 | — | `export-csv --month 2026-08` | las filas son, en orden, F-1001 y F-1002 |
| CA-9 | — | `--month agosto` o `--month 2026-13` | exit ≠ 0, mensaje de uso en stderr y no se crea ni sobrescribe el archivo |
| CA-10 | ninguna factura en el mes | `--month 2025-01` | exit 0 y el CSV contiene solo el encabezado |
| CA-11 | un arreglo en memoria con el cliente "Compañía Ñuble" | se serializa a CSV | los bytes empiezan con `EF BB BF`, usan `;` y `\r\n`, y el nombre se decodifica intacto como UTF-8 |
| CA-12 | un arreglo en memoria con el cliente `Sur; Norte "SpA"` | se serializa a CSV | el campo sale como `"Sur; Norte ""SpA"""` |
| CA-13 | — | `npm test` y `node src/cli.js list` | los 4 tests existentes pasan sin modificarlos y `list` sigue imprimiendo F-1001..F-1004 separados por tab, incluida F-1003 `void` |

Cómo se verifica:

- CA-1 a CA-10 son end-to-end sobre el CLI con los datos actuales.
- CA-11 y CA-12 se prueban sobre la función que convierte un arreglo de facturas en bytes CSV, porque `src/invoices.js` siempre lee `src/data/invoices.json` y esos datos no tienen acentos ni `;`.
- "Abre bien en Excel" no es testeable directo; CA-11 lo reemplaza por condiciones verificables (BOM, separador, fin de línea).

### Decisiones del grill

1. Anuladas: excluidas por defecto, `--include-void` las incluye para cuadrar.
2. Separador `;` (Excel con configuración regional es-CL).
3. Orden de filas: el mismo del JSON.
4. Archivo existente: se sobrescribe.
5. Escapado RFC 4180 (CA-12): se queda; con `;` un cliente con `;` correría las columnas.
6. CA-11/CA-12 se verifican sobre la serialización, sin tocar `src/invoices.js`.

## Fuera de alcance

- Endpoint HTTP, login o cualquier despliegue a producción.
- Generar `.xlsx` u otros formatos distintos de CSV.
- Traducir los estados (`paid`, `open`, `void` se exportan tal cual).
- Rangos de varios meses, filtro por cliente u otros filtros.
- Cambiar el formato de salida de `list` o `get`.
- Modificar `src/data/invoices.json`.
