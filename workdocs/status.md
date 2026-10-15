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
| T-01-story-1 | | | |
| T-01-story-2 | `npm test` | Rojo (2026-10-15): fallan los 6 tests de `test/export-month.test.js` (criterios 4, 9 y 10). Los 4 tests de `test/invoices.test.js` siguen verdes, incluido "the listing still includes voided invoices". | Falta el código. Bloqueada por la story 1: `src/csv.js` y `src/export.js` todavía no están en `main`, así que el comando `export-csv` no existe. |
| T-01-story-3 | | | |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-2 | Worker de investigación (Explore, solo lectura): revisar `test/export-month.test.js` contra los criterios 4, 9 y 10 de `SPEC.md`, buscando aserciones sin respaldo y falsos verdes. | Encontró dos cosas, ambas corregidas: (1) `assert.match(stderr, /month/i)` imponía wording en inglés que la spec no fija → ahora acepta el valor inválido, `month` o `mes`; (2) "no crea ningún archivo" solo miraba `facturas.csv` → ahora exige el directorio vacío con `readdirSync`. Sin hallazgos en el criterio 4. |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
