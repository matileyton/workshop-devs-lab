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
| T-01-story-2 | | | |
| T-01-story-3 | `npm test` (`test/export-out.test.js`, criterios 3, 8 y 12) | Rojo 15-10: tests 7, pass 4, fail 3. Los 3 de story 3 fallan porque `export-csv` no existe (`usage: node src/cli.js <list\|get> [id]`, exit 1). Los 4 de `main` pasan. | Falta el código: depende de que story 1 esté en `main`. |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-3 | Explore: revisar `test/export-out.test.js` contra los criterios 3, 8 y 12 (falsos verdes, alcance). | C12 podía dar falso verde con un error de flag desconocido: ahora exige que stderr nombre `no-existe`. Se sacó el chequeo de BOM de C8 (es del criterio 1). Se mantuvo el orden en C3 (la SPEC lo fija). |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**
