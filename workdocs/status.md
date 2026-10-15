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
| T-01-story-2 | | | |
| T-01-story-3 | `npm test` (`test/export-out.test.js`, criterios 3, 8 y 12) | Rojo 15-10: tests 7, pass 4, fail 3. Los 3 de story 3 fallan porque `export-csv` no existe (`usage: node src/cli.js <list\|get> [id]`, exit 1). Los 4 de `main` pasan. Tras traer story 1 de `main`: siguen 3 fail, ahora por falta de `--include-void` y `--out`. Verde (15-10): tests 15, pass 15, fail 0. | Ninguno. |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore (solo lectura): revisar `test/export.test.js` contra los criterios 1, 2, 5, 6 y 7 de la SPEC. | Los 5 criterios quedan asertados. Sin falsos verdes claros. Los 5 tests fallan por ausencia de código, no por otra causa. Nota: `npm test` debe correr desde la raíz del repo (el test usa `path.resolve('src/cli.js')`). |
| T-01-story-3 | Explore: revisar `test/export-out.test.js` contra los criterios 3, 8 y 12 (falsos verdes, alcance). | C12 podía dar falso verde con un error de flag desconocido: ahora exige que stderr nombre `no-existe`. Se sacó el chequeo de BOM de C8 (es del criterio 1). Se mantuvo el orden en C3 (la SPEC lo fija). |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
