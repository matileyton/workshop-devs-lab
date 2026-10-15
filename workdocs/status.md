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
| T-01-story-3 | | | |

## Workers

Una tarea acotada y su resumen. Si hubo implementación y falta esta línea, M4 no pasa.

| Story | Tarea | Resumen |
|---|---|---|
| T-01-story-1 | Explore (solo lectura): revisar `test/export.test.js` contra los criterios 1, 2, 5, 6 y 7 de la SPEC. | Los 5 criterios quedan asertados. Sin falsos verdes claros. Los 5 tests fallan por ausencia de código, no por otra causa. Nota: `npm test` debe correr desde la raíz del repo (el test usa `path.resolve('src/cli.js')`). |
| T-01-story-2 | Worker de investigación (Explore, solo lectura): revisar `test/export-month.test.js` contra los criterios 4, 9 y 10 de `SPEC.md`, buscando aserciones sin respaldo y falsos verdes. | Encontró dos cosas, ambas corregidas: (1) `assert.match(stderr, /month/i)` imponía wording en inglés que la spec no fija → ahora acepta el valor inválido, `month` o `mes`; (2) "no crea ningún archivo" solo miraba `facturas.csv` → ahora exige el directorio vacío con `readdirSync`. Sin hallazgos en el criterio 4. |
| T-01-story-2 | Worker de implementación (Sonnet): escribir `src/month.js` y conectar el filtro en `src/export.js` y `src/cli.js` hasta poner en verde `test/export-month.test.js`, sin tocar el test ni commitear. | Dejó los 3 archivos en el working tree y la suite en 18/18. Revisé el diff: sin secretos, auth, cambios de contrato ni migraciones; `buildExport` mantiene la firma y `--include-void` / `--out` quedan para la story 3. Ajusté dos cosas de legibilidad antes de commitear. |

## Día 3

**Mergeó:**

**Quedó fuera (gap, no vendido como merge):**

**PRs:**

- T-01-story-2 (Antonia Urrutia): https://github.com/matileyton/workshop-devs-lab/pull/6 — draft, solo el test rojo.
