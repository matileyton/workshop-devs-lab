# status.md

Seguimiento y bitácora. No sustituye a la spec.

Edita este archivo en tu rama y cambia solo tu fila, para que el merge del Día 3 no tenga conflictos.

## Roles

El merge del equipo no aprueba a quien no rotó. Cada persona anota su nombre en al menos 2 roles.

| Persona | Roles (por ejemplo: redacción o grill de la spec, dueña de test, comentario de review) |
|---|---|
| | |
| | |
| | |
| | |

## Grill

| Fecha | Quién | Archivo | Notas |
|---|---|---|---|
| | | `workdocs/SPEC.md` | |

## Tests de aceptación

Anota el comando y el resultado. Primero rojo. Después verde, o un gap citado.

| Story | Comando | Resultado | Gap (si sigue rojo) |
|---|---|---|---|
| T-01-story-1 | `npm test` | Rojo (2026-10-15): `test/export.test.js` 5 fail (criterios 1, 2, 5, 6, 7); 4 pass (tests previos de `list`/`get`). Falla porque `export-csv` y `src/csv.js` no existen. Verde (2026-10-15): 9 tests, 9 pass, 0 fail. Revisión de seguridad: se agregó el criterio 13 (CWE-1236); rojo 1 fail de 10, luego verde 10 de 10. Review del agente: criterio 14, tab y CR, campos vacíos; rojo 3 fail de 12, luego verde 12 de 12. | Ninguno. |
| T-01-story-2 | `npm test` | Rojo (2026-10-15): fallan los 6 tests de `test/export-month.test.js` (criterios 4, 9 y 10), con el resto de la suite en verde. Verde (2026-10-15), tras mergear la story 1 e implementar el filtro: 18 tests, 18 pass, 0 fail. | Ninguno. |
| T-01-story-3 | `npm test` (`test/export-out.test.js`, criterios 3, 8 y 12) | Rojo 15-10: tests 7, pass 4, fail 3. Los 3 de story 3 fallan porque `export-csv` no existe (`usage: node src/cli.js <list\|get> [id]`, exit 1). Los 4 de `main` pasan. Tras traer story 1 de `main`: siguen 3 fail, ahora por falta de `--include-void` y `--out`. Verde (15-10): tests 15, pass 15, fail 0. Tras mergear story 2 de `main` (conflicto en `src/cli.js` y `src/export.js` resuelto: se valida `--month` antes de escribir y `buildExport` recibe `month` e `includeVoid`): tests 21, pass 21, fail 0. | Ninguno. |
| T-02-story-1 | `node --test test/export-encoding.test.js` (criterio 15) y `npm test` | Sin rojo real (19-10): el comportamiento ya estaba en `main` (criterio 1), así que es test de caracterización y pasa de entrada: tests 3, pass 3, fail 0. Para probar que no es un falso verde, se corrió contra 3 mutantes temporales (revertidos, no commiteados): escribir en `latin1` → 3 fail; sin BOM → 2 fail; separador `,` → 1 fail. Suite completa: tests 24, pass 24, fail 0. | Ninguno. Sin cambios de código de producto. |
| Fix criterio 16 (`--month` sin fecha) | `npm test` | Rojo (2026-10-19): tests 26, pass 22, fail 4. Fallan los 4 casos nuevos de `test/month.test.js` con `TypeError` desde `src/month.js:8` (`null`, `undefined`, numérico, objeto); el 5º, la guarda de regresión, pasa. Verde (2026-10-19) tras la guarda `typeof invoice.issuedAt === 'string'`: tests 26, pass 26, fail 0. Tras mergear T-02 de `main`: tests 29, pass 29, fail 0. | Ninguno. |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore (solo lectura): revisar `test/export.test.js` contra los criterios 1, 2, 5, 6 y 7 de la SPEC. | Los 5 criterios quedan asertados. Sin falsos verdes claros. Los 5 tests fallan por ausencia de código, no por otra causa. Nota: `npm test` debe correr desde la raíz del repo (el test usa `path.resolve('src/cli.js')`). |
| T-01-story-2 | Worker de investigación (Explore, solo lectura): revisar `test/export-month.test.js` contra los criterios 4, 9 y 10 de `SPEC.md`, buscando aserciones sin respaldo y falsos verdes. | Encontró dos cosas, ambas corregidas: (1) `assert.match(stderr, /month/i)` imponía wording en inglés que la spec no fija → ahora acepta el valor inválido, `month` o `mes`; (2) "no crea ningún archivo" solo miraba `facturas.csv` → ahora exige el directorio vacío con `readdirSync`. Sin hallazgos en el criterio 4. |
| T-01-story-2 | Worker de implementación (Sonnet): escribir `src/month.js` y conectar el filtro en `src/export.js` y `src/cli.js` hasta poner en verde `test/export-month.test.js`, sin tocar el test ni commitear. | Dejó los 3 archivos en el working tree y la suite en 18/18. Revisé el diff: sin secretos, auth, cambios de contrato ni migraciones; `buildExport` mantiene la firma y `--include-void` / `--out` quedan para la story 3. Ajusté dos cosas de legibilidad antes de commitear. |
| T-01-story-3 | Explore: revisar `test/export-out.test.js` contra los criterios 3, 8 y 12 (falsos verdes, alcance). | C12 podía dar falso verde con un error de flag desconocido: ahora exige que stderr nombre `no-existe`. Se sacó el chequeo de BOM de C8 (es del criterio 1). Se mantuvo el orden en C3 (la SPEC lo fija). |
| Fix criterio 16 | Sin subagente: la exploración del caso borde se hizo en sesión (lectura de `src/month.js`, `src/csv.js` y los archivos de test, más corridas del CLI contra una copia temporal del fixture). | `escapeField` ya se defendía de `null` y `test/export.test.js:80` ya pasa `issuedAt: undefined`: el filtro era el único módulo sin la guarda. El caso no es alcanzable por CLI con el fixture actual (está limpio y modificarlo es fuera de alcance), así que el test es unitario sobre `filterByMonth`. Queda la pregunta para María: omitir en silencio vs. señalar la factura. |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**

- T-01-story-2 (Antonia Urrutia): https://github.com/matileyton/workshop-devs-lab/pull/6 — draft, solo el test rojo.
