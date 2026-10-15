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
| T-01-story-1 | `npm test` | Rojo (2026-10-15): `test/export.test.js` 5 fail (criterios 1, 2, 5, 6, 7); 4 pass (tests previos de `list`/`get`). Falla porque `export-csv` y `src/csv.js` no existen. Verde (2026-10-15): 9 tests, 9 pass, 0 fail. | Ninguno. |
| T-01-story-2 | | | |
| T-01-story-3 | | | |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore (solo lectura): revisar `test/export.test.js` contra los criterios 1, 2, 5, 6 y 7 de la SPEC. | Los 5 criterios quedan asertados. Sin falsos verdes claros. Los 5 tests fallan por ausencia de código, no por otra causa. Nota: `npm test` debe correr desde la raíz del repo (el test usa `path.resolve('src/cli.js')`). |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
