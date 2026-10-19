// Página del panel (GET /). Story 2 de T-02-panel: criterios P8, P9, P10, P17 y P18
// de workdocs/SPEC.md. Un solo HTML con su JS en línea, sin nada externo.
// El diseño (La cordillera) cubre P21 a P24.
//
// Las funciones puras (computeTotal, renderRows, renderCordillera, interpolar, etc.) se
// exportan para el test. El <script> de la página las incrusta con .toString(), así María
// corre exactamente las funciones que el test prueba.

// En la API el estado va con los valores del JSON; la página los muestra en español.
const ESTADOS = { paid: 'pagada', open: 'abierta', void: 'anulada' }

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function computeTotal(invoices) {
  return invoices.reduce((total, invoice) => total + invoice.amount, 0)
}

// data-id y data-estado enlazan cada fila con su pico de la cordillera (P23).
export function renderRows(invoices) {
  return invoices
    .map((invoice) => {
      const estado = ESTADOS[invoice.status] ?? invoice.status
      const celdas = [invoice.id, invoice.client, invoice.issuedAt, invoice.amount, estado]
      const atributos = `data-id="${escapeHtml(invoice.id)}" data-estado="${escapeHtml(estado)}"`
      return `<tr ${atributos}>${celdas.map((celda) => `<td>${escapeHtml(celda)}</td>`).join('')}</tr>`
    })
    .join('')
}

export function buildExportUrl({ status, month, includeVoid }) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (month) params.set('month', month)
  // includeVoid=false equivale a no mandarlo: el CSV ya excluye las anuladas (T-01).
  if (includeVoid) params.set('includeVoid', 'true')
  const query = params.toString()
  return query ? `/api/export.csv?${query}` : '/api/export.csv'
}

// Manda la consulta más nueva: una respuesta que llega tarde no puede pisar la tabla
// con el filtro anterior. Hallazgo de la review del PR #13.
export function crearTurnos() {
  let ultimo = 0
  return {
    pedir: () => (ultimo += 1),
    vigente: (turno) => turno === ultimo,
  }
}

// Un error sin mensaje no se le muestra a María como "undefined".
export function mensajeDeError(status, cuerpo) {
  const mensaje = cuerpo?.error
  if (typeof mensaje === 'string' && mensaje !== '') return mensaje
  return `La API respondió ${status} sin explicar el error.`
}

// La cordillera (P22): un pico por factura, con la altura proporcional al monto. Faceta
// clara a la izquierda y sombra a la derecha. Los más altos se dibujan primero, así los
// bajos quedan por delante y se ve una cordillera en vez de picos sueltos.
export function renderCordillera(invoices) {
  if (invoices.length === 0) return ''
  const ALTO = 180
  const PASO = 160
  const BASE = 190
  const MITAD = 105
  const montoValido = (invoice) =>
    Number.isFinite(invoice.amount) && invoice.amount > 0 ? invoice.amount : 0
  const mayor = Math.max(...invoices.map(montoValido))
  const picos = invoices.map((invoice, indice) => {
    const altura = mayor > 0 ? Math.max(8, Math.round((montoValido(invoice) / mayor) * ALTO)) : 8
    const x = PASO * indice + PASO / 2
    const cima = BASE - altura
    const etiqueta = ESTADOS[invoice.status] ?? 'otra'
    const titulo = escapeHtml(`${invoice.id}: ${invoice.client}, ${invoice.amount}, ${etiqueta}`)
    const clara = `${x - MITAD},${BASE} ${x},${cima} ${x},${BASE}`
    const sombra = `${x},${BASE} ${x},${cima} ${x + MITAD},${BASE}`
    const contorno = `${x - MITAD},${BASE} ${x},${cima} ${x + MITAD},${BASE}`
    return {
      altura,
      svg:
        `<g class="pico pico-${etiqueta}" data-id="${escapeHtml(invoice.id)}" data-altura="${altura}" style="--i:${indice}" tabindex="0">` +
        `<title>${titulo}</title>` +
        `<polygon class="cara-clara" points="${clara}"/>` +
        `<polygon class="cara-sombra" points="${sombra}"/>` +
        `<polygon class="contorno" points="${contorno}"/>` +
        `</g>`,
    }
  })
  const dibujo = [...picos].sort((a, b) => b.altura - a.altura).map((pico) => pico.svg)
  const ancho = PASO * invoices.length + 60
  return (
    `<svg viewBox="-30 0 ${ancho} 200" preserveAspectRatio="xMidYMax meet" role="group" ` +
    `aria-label="Cordillera de facturas: la altura de cada pico es su monto">` +
    `<line class="suelo" x1="-30" y1="${BASE}" x2="${ancho - 30}" y2="${BASE}"/>` +
    dibujo.join('') +
    `</svg>`
  )
}

// Ritmo del conteo del total (P24): arranca rápido y frena al llegar. Devuelve enteros.
export function interpolar(desde, hasta, t) {
  const avance = 1 - Math.pow(1 - t, 3)
  return Math.round(desde + (hasta - desde) * avance)
}

// Solo para el número grande de la cumbre (P24); las celdas de la tabla no se tocan.
export function formatearPesos(monto) {
  return String(Math.round(monto)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function renderOptions() {
  const opciones = [['', 'todos'], ...Object.entries(ESTADOS)]
  return opciones
    .map(([valor, etiqueta]) => `<option value="${valor}">${etiqueta}</option>`)
    .join('\n          ')
}

function renderScript() {
  return `
const ESTADOS = ${JSON.stringify(ESTADOS)}

${escapeHtml.toString()}

${computeTotal.toString()}

${renderRows.toString()}

${buildExportUrl.toString()}

${crearTurnos.toString()}

${mensajeDeError.toString()}

${renderCordillera.toString()}

${interpolar.toString()}

${formatearPesos.toString()}

const turnos = crearTurnos()
const reducido = window.matchMedia('(prefers-reduced-motion: reduce)')

const estado = document.getElementById('estado')
const mes = document.getElementById('mes')
const anuladas = document.getElementById('anuladas')
const filas = document.getElementById('filas')
const total = document.getElementById('total')
const totalAria = document.getElementById('total-aria')
const cordillera = document.getElementById('cordillera')
const vacio = document.getElementById('vacio')
const error = document.getElementById('error')
const descargar = document.getElementById('descargar')

function filtros() {
  return { status: estado.value, month: mes.value, includeVoid: anuladas.checked }
}

function actualizarDescarga() {
  descargar.setAttribute('href', buildExportUrl(filtros()))
}

// El total sube (o baja) hasta su valor; con movimiento reducido salta directo.
function mostrarTotal(hasta) {
  const desde = Number(total.dataset.valor || 0)
  total.dataset.valor = String(hasta)
  totalAria.textContent = 'Total a la vista: ' + formatearPesos(hasta) + ' pesos'
  if (reducido.matches || desde === hasta) {
    total.textContent = formatearPesos(hasta)
    return
  }
  const inicio = performance.now()
  const paso = (ahora) => {
    if (Number(total.dataset.valor) !== hasta) return
    const t = Math.min((ahora - inicio) / 800, 1)
    total.textContent = formatearPesos(interpolar(desde, hasta, t))
    if (t < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}

async function cargar() {
  const { status, month } = filtros()
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (month) params.set('month', month)
  const query = params.toString()
  const turno = turnos.pedir()

  let respuesta
  let cuerpo
  // El try cubre solo la red: si falla el render, el mensaje no culpa a la API.
  try {
    respuesta = await fetch('/api/invoices' + (query ? '?' + query : ''))
    cuerpo = await respuesta.json()
  } catch {
    if (turnos.vigente(turno)) {
      error.textContent = 'No se pudo consultar la API. ¿Sigue corriendo node src/server.js?'
    }
    return
  }

  // Llegó tarde: ya hay una consulta más nueva en vuelo.
  if (!turnos.vigente(turno)) return

  if (!respuesta.ok) {
    // La tabla queda como estaba: María sigue viendo lo último que cargó bien.
    error.textContent = mensajeDeError(respuesta.status, cuerpo)
    return
  }
  error.textContent = ''
  filas.innerHTML = renderRows(cuerpo)
  cordillera.innerHTML = renderCordillera(cuerpo)
  vacio.hidden = cuerpo.length !== 0
  mostrarTotal(computeTotal(cuerpo))
}

// Pasar el mouse o el foco por una fila ilumina su pico, y al revés.
function resaltar(id, activo) {
  for (const elemento of document.querySelectorAll('[data-id]')) {
    if (elemento.dataset.id === id) elemento.classList.toggle('activo', activo)
  }
}
for (const zona of [filas, cordillera]) {
  for (const [evento, activo] of [['mouseover', true], ['focusin', true], ['mouseout', false], ['focusout', false]]) {
    zona.addEventListener(evento, (e) => {
      const elemento = e.target.closest('[data-id]')
      if (elemento) resaltar(elemento.dataset.id, activo)
    })
  }
}

for (const campo of [estado, mes]) {
  campo.addEventListener('change', () => {
    actualizarDescarga()
    cargar()
  })
}
anuladas.addEventListener('change', actualizarDescarga)

actualizarDescarga()
cargar()
`
}

// Paleta del altiplano: salar, lapislázuli, laguna (pagada), sol de puna (abierta) y flamingo.
function renderStyle() {
  return `
    :root {
      --salar: #f2f5f1;
      --superficie: #ffffff;
      --tinta: #16245c;
      --roca: #4a5068;
      --suelo: #d3dcd6;
      --laguna: #0b7f74;
      --sol: #b87800;
      --flamingo: #ff4f7b;
      --foco: #d9285a;
      --titulo: 'Bahnschrift', 'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif;
      --cuerpo: 'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --salar: #0c1130;
        --superficie: #141a42;
        --tinta: #eaf0ff;
        --roca: #aab3d6;
        --suelo: #2a3166;
        --laguna: #2edfcb;
        --sol: #ffcb52;
        --foco: #ff7a9c;
      }
    }
    * { box-sizing: border-box; }
    html { background: var(--salar); }
    body {
      margin: 0;
      font-family: var(--cuerpo);
      color: var(--tinta);
      background: var(--salar);
      line-height: 1.5;
    }
    main { max-width: 68rem; margin: 0 auto; padding: 0 1.25rem 4rem; }
    :focus-visible { outline: 3px solid var(--foco); outline-offset: 3px; }

    .marca { display: flex; align-items: center; gap: 0.6rem; padding: 1.25rem 0 1rem; font-family: var(--titulo); font-size: 1.35rem; font-weight: 700; letter-spacing: 0.01em; }
    .marca svg { width: 2rem; height: 2rem; }

    .cumbre {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1.25rem, 4vw, 2.75rem) 0;
      color: #fff;
      background:
        radial-gradient(120% 85% at 80% 118%, rgba(255, 79, 123, 0.9) 0%, rgba(255, 79, 123, 0) 58%),
        linear-gradient(180deg, #16245c 0%, #2b2a7e 68%, #4a2a86 100%);
    }
    .cumbre h1 { margin: 0; font-size: 1.05rem; font-weight: 600; opacity: 0.85; }
    .total { margin: 0.35rem 0 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.25rem 1rem; }
    #total {
      font-family: var(--titulo);
      font-size: clamp(3.6rem, 12vw, 8.5rem);
      font-weight: 800;
      line-height: 0.95;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0.04em 0 rgba(22, 36, 92, 0.55);
    }
    .total-unidad { font-size: 1.05rem; opacity: 0.9; }

    .cordillera { margin-top: 0.5rem; }
    .cordillera svg { display: block; width: 100%; height: clamp(170px, 30vw, 300px); overflow: visible; }
    .suelo { stroke: rgba(255, 255, 255, 0.55); stroke-width: 2; }
    .pico { cursor: pointer; transform-box: fill-box; transform-origin: 50% 100%; animation: subir 0.8s cubic-bezier(0.2, 0.85, 0.25, 1) both; animation-delay: calc(var(--i) * 110ms); }
    .pico polygon { transition: filter 0.2s, stroke 0.2s; }
    .contorno { fill: none; stroke: none; stroke-linejoin: round; }
    .pico-pagada .cara-clara { fill: #2edfcb; }
    .pico-pagada .cara-sombra { fill: #0c8f84; }
    .pico-abierta .cara-clara { fill: #ffcb52; }
    .pico-abierta .cara-sombra { fill: #d18f00; }
    .pico-anulada .cara-clara, .pico-anulada .cara-sombra { fill: rgba(255, 255, 255, 0.1); }
    .pico-anulada .contorno { stroke: #fff; stroke-width: 2.5; stroke-dasharray: 8 7; }
    .pico-otra polygon { fill: #aab3d6; }
    .pico.activo polygon { filter: brightness(1.18); }
    .pico.activo .contorno { stroke: #fff; stroke-width: 4; stroke-dasharray: none; }
    .pico:focus-visible { outline: none; }
    .pico:focus-visible .contorno { stroke: var(--flamingo); stroke-width: 5; stroke-dasharray: none; }
    @keyframes subir { from { transform: scaleY(0); } }

    .filtros { display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; align-items: end; padding: 1.5rem 0 1rem; }
    .campo { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; }
    select, input[type="month"] {
      font: inherit; font-weight: 400; color: var(--tinta); background: var(--superficie);
      border: 2px solid var(--suelo); border-radius: 10px; padding: 0.55rem 0.8rem; min-width: 11rem;
    }
    select:hover, input[type="month"]:hover { border-color: var(--roca); }
    .anuladas { display: flex; flex-direction: column; gap: 0.1rem; }
    .anuladas label { display: flex; align-items: center; gap: 0.55rem; font-weight: 600; cursor: pointer; }
    .anuladas input { width: 1.25rem; height: 1.25rem; accent-color: var(--flamingo); }
    .anuladas small { color: var(--roca); margin-left: 1.8rem; }
    #descargar {
      margin-left: auto; text-decoration: none; font-weight: 700; color: #16245c; background: var(--flamingo);
      padding: 0.75rem 1.5rem; border-radius: 10px; box-shadow: 0 3px 0 #b81f4d; transition: transform 0.15s, box-shadow 0.15s;
    }
    #descargar:hover { transform: translateY(-2px); box-shadow: 0 5px 0 #b81f4d; }
    #descargar:active { transform: translateY(2px); box-shadow: 0 1px 0 #b81f4d; }

    #error { margin: 0 0 1rem; padding: 0.75rem 1rem; border-left: 6px solid var(--flamingo); background: var(--superficie); font-weight: 600; }
    #error:empty { display: none; }
    #vacio { margin: 1rem 0; color: var(--roca); }

    .libro { overflow-x: auto; background: var(--superficie); border: 2px solid var(--suelo); }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th { text-align: left; font-weight: 700; padding: 0.8rem 1rem; border-bottom: 3px solid var(--tinta); white-space: nowrap; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--suelo); }
    td:nth-child(4), th:nth-child(4) { text-align: right; }
    tbody tr { transition: background 0.15s; }
    tr.activo { background: rgba(18, 181, 166, 0.16); }
    td:nth-child(5)::before { content: ''; display: inline-block; width: 0.7em; height: 0.7em; margin-right: 0.5em; border-radius: 50%; background: var(--roca); }
    tr[data-estado="pagada"] td:nth-child(5)::before { background: var(--laguna); }
    tr[data-estado="abierta"] td:nth-child(5)::before { background: var(--sol); }
    tr[data-estado="anulada"] td:nth-child(5)::before { background: transparent; border: 2px dashed var(--roca); }
    tr[data-estado="anulada"] td { color: var(--roca); }
    tr[data-estado="anulada"] td:nth-child(4) { text-decoration: line-through; }

    .solo-lector { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    @media (max-width: 40rem) {
      #descargar { margin-left: 0; width: 100%; text-align: center; }
      main { padding: 0 0.75rem 3rem; }
      table { font-size: 0.8rem; }
      th, td { padding: 0.55rem 0.35rem; }
      td:nth-child(1), td:nth-child(3), td:nth-child(5) { white-space: nowrap; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `
}

export function renderPage() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>Panel de facturas — Andes Lab</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpolygon points='2,28 13,6 17,14 21,9 30,28' fill='%23ff4f7b'/%3E%3C/svg%3E">
  <style>${renderStyle()}</style>
</head>
<body>
  <main>
    <header class="marca">
      <svg viewBox="0 0 32 32" aria-hidden="true"><polygon points="2,28 13,6 17,14 21,9 30,28" fill="#ff4f7b"/><polygon points="13,6 17,14 11,28 2,28" fill="#16245c" opacity="0.35"/></svg>
      Andes Lab
    </header>

    <section class="cumbre" aria-labelledby="titulo">
      <h1 id="titulo">Facturas de tesorería</h1>
      <p class="total" aria-hidden="true"><span id="total">0</span><span class="total-unidad">pesos a la vista</span></p>
      <p id="total-aria" class="solo-lector" role="status"></p>
      <div id="cordillera" class="cordillera"></div>
    </section>

    <section class="filtros" aria-label="Filtros">
      <div class="campo">
        <label for="estado">Estado</label>
        <select id="estado" name="estado">
          ${renderOptions()}
        </select>
      </div>
      <div class="campo">
        <label for="mes">Mes</label>
        <input id="mes" name="mes" type="month" pattern="\\d{4}-(0[1-9]|1[0-2])" placeholder="2026-08">
      </div>
      <div class="anuladas">
        <label><input id="anuladas" name="anuladas" type="checkbox"> Incluir anuladas en el CSV</label>
        <small>Por defecto el CSV no las incluye.</small>
      </div>
      <a id="descargar" href="/api/export.csv" download>Descargar CSV</a>
    </section>

    <p id="error" role="alert"></p>

    <div class="libro">
      <table>
        <thead>
          <tr><th>id</th><th>cliente</th><th>fecha</th><th>monto</th><th>estado</th></tr>
        </thead>
        <tbody id="filas"></tbody>
      </table>
    </div>
    <p id="vacio" hidden>No hay facturas con estos filtros. Cambia el estado o el mes.</p>
  </main>

  <script>${renderScript()}</script>
</body>
</html>
`
}

export function handlePage(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(renderPage())
}
