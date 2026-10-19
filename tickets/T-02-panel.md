# T-02-panel: Panel de facturas para María

**Estado:** Todo  
**Pedido por:** María (tesorería, Andes Lab)  
**Origen:** issue "T-02: Panel de facturas para María (competencia Día 3)", Tesseron-Chile/workshop-devs-kit#3. Se guarda como T-02-panel porque en este repo T-02 ya es el ticket de eñes y BOM del CSV.  
**Para:** la competencia del Día 3 (55 min)

## Qué pasa hoy

María ya tiene el CSV (T-01), pero para revisar las facturas antes de mandarlas abre la terminal y no le gusta. Quiere verlas en el navegador.

## Pedido

Una página web local que María abre en `http://localhost:3000` después de correr:

```
node src/server.js
```

En la página:

- Una tabla con las facturas: id, cliente, fecha, monto y estado.
- Filtros por estado (pagada, abierta, anulada) y por mes.
- El total de lo que se ve en la tabla.
- Un botón "Descargar CSV" que baja el mismo CSV del T-01, con los filtros aplicados.

## Reglas técnicas

- Sin dependencias nuevas: `node:http`, `node:test` y `fetch`, que vienen con Node 20. Nada de `npm install`.
- La página es un solo HTML con su JS, servido por el mismo `src/server.js`.
- Los datos salen de `src/data/invoices.json` a través de `src/invoices.js`.
- Cada endpoint tiene su test en `test/` y `npm test` queda en verde en `main`.

## Stories sugeridas (una por persona)

| Story | Qué | Test |
|---|---|---|
| S1 · API | `GET /api/invoices?status=&month=` devuelve JSON filtrado | levanta el server en un puerto libre y prueba los filtros con `fetch` |
| S2 · Página | `GET /` sirve el HTML: tabla, filtros y total | el HTML responde 200 y trae la tabla; el total se calcula en una función con test |
| S3 · Descarga | `GET /api/export.csv?status=&month=` usa el export del T-01 | el CSV trae el encabezado y respeta los filtros |
| S4 · Extra (equipo de 4) | monto en pesos chilenos en la tabla, anuladas en gris, búsqueda por cliente | el formato del monto tiene test |

Si el T-01 de tu equipo no quedó en `main`, la S3 escribe un export mínimo con su test. (En este equipo T-01 sí está en `main`.)

## Fuera de alcance

Login, base de datos, deploy, frameworks de front.
