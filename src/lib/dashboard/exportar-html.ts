/**
 * Generador del dashboard autónomo.
 *
 * Produce un único archivo `.html` sin dependencias: ni CDN, ni fuentes
 * remotas, ni JavaScript salvo el botón de imprimir. Se abre con doble clic en
 * cualquier equipo, funciona sin conexión y no consulta la base de datos —es
 * una foto del recorte que estaba en pantalla al pulsar el botón.
 *
 * Lee el mismo `ModeloDashboard` que la vista de React y la misma geometría,
 * así que el archivo descargado no puede decir algo distinto de lo que se vio.
 * Lo único que se duplica es el maquetado, porque el medio es otro: aquí no hay
 * Tailwind ni modo oscuro, y sí hay hoja impresa.
 */

import {
  ALTO_COLUMNAS,
  ANILLO,
  GROSOR_COLUMNA,
  MINIMO_ETIQUETA_DENTRO,
  TIPOGRAFIA_ANILLO,
  trazosAnillo,
} from "@/lib/dashboard/geometria";
import type {
  BarraProgreso,
  Columna,
  FilaDetalle,
  ModeloDashboard,
  Segmento,
} from "@/lib/dashboard/modelo";

/**
 * Los mismos tokens de `globals.css`, en claro. La página exportada los declara
 * en su propio `:root`, así que las cadenas `var(--x)` que trae el modelo
 * pintan aquí exactamente igual que en la aplicación y no hay dos paletas que
 * mantener sincronizadas —solo esta lista.
 */
const TOKENS = `
  --background: #f8faff;
  --foreground: #1e2e5a;
  --card: #ffffff;
  --muted: #eef2fb;
  --muted-foreground: #5b6a94;
  --border: #dde5f7;

  --chart-1: #1067f2;
  --chart-2: #eb6834;
  --chart-3: #1baf7a;
  --chart-4: #eda100;
  --chart-5: #e87ba4;

  --fase-planificacion: #86b6ef;
  --fase-contexto: #5598e7;
  --fase-desarrollo: #2a78d6;
  --fase-tic: #1c5cab;
  --fase-produccion: #104281;

  --grafico-eje: #c3cee6;
`;

/** Isotipo de Grupo Serex, en línea para que el archivo no dependa de nada. */
const LOGO = `<svg viewBox="0 0 57.29 57.81" width="26" height="26" fill="#1e2e5a" aria-hidden="true"><path d="M55.89,24a3.38,3.38,0,0,1-.47-.35c-2.37-2.43-5.36-3.18-8.63-3.05-5.19.22-9.85,2.2-14.38,4.54-3.57,1.85-7,3.91-10.64,5.66a22.31,22.31,0,0,1-10.72,2.4,10.9,10.9,0,0,1-7-2.49,10.19,10.19,0,0,1-3-5.87c-.94-4.56.31-8.7,2.67-12.57a24.26,24.26,0,0,1,9.66-8.53,31.35,31.35,0,0,1,12-3.65A1.44,1.44,0,0,0,25.61,0h5.11c1.29.24,2.59.44,3.87.73,9.07,2.06,20.34,10.5,22.52,24.13.07.47.11.94.18,1.55l-1-1.78a2,2,0,0,0-.1-.66c-1.35-2.52-2.57-5.13-4.12-7.53-5.41-8.38-16.17-13-25.95-10.61-4.07,1-7.69,2.66-10.34,6A9.69,9.69,0,0,0,13.45,19c.34,3.32,3.12,5.74,6.87,6.05a21.47,21.47,0,0,0,9.52-1.59c2.38-.91,4.66-2.05,7-3C40.59,19,44.43,18.16,48.44,19A11.46,11.46,0,0,1,55.89,24Z"/><path d="M1.32,33.81a1.13,1.13,0,0,1,.33.16c2.69,2.82,6.09,3.46,9.77,3.12a35.47,35.47,0,0,0,13-4.29c3.57-1.85,7-3.91,10.63-5.68a22.57,22.57,0,0,1,11.67-2.53,9.93,9.93,0,0,1,7,3A10.67,10.67,0,0,1,56.37,34c.6,6.52-2,11.82-6.77,16a30.67,30.67,0,0,1-19.31,7.73c-8,.4-14.87-2.51-20.77-7.79A28.81,28.81,0,0,1,.16,33.32,9.72,9.72,0,0,1,0,31.52l1,1.74a1.2,1.2,0,0,0,0,.38c2,4.63,4.41,9,8.2,12.39,7.21,6.47,17.38,8.65,26.8,4.26a13.55,13.55,0,0,0,7.28-7.51c1.8-4.74-.61-9-5.54-9.92a16.44,16.44,0,0,0-6.55.35,40.23,40.23,0,0,0-8.49,3.12c-4,1.88-8.15,3.21-12.66,2.64A11.89,11.89,0,0,1,1.32,33.81Z"/></svg>`;

// -------------------------------------------------------------- Utilidades

/** Escapa todo lo que venga de la base de datos. */
function esc(valor: string | number): string {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tarjeta(titulo: string, descripcion: string, cuerpo: string): string {
  return `<section class="tarjeta">
      <header class="tarjeta-titulo">
        <h2>${esc(titulo)}</h2>
        <p>${esc(descripcion)}</p>
      </header>
      ${cuerpo}
    </section>`;
}

// ------------------------------------------------------------------ Piezas

function anilloHtml(segmentos: Segmento[], total: number): string {
  const visibles = segmentos.filter((s) => s.cantidad > 0);
  if (visibles.length === 0) return `<p class="sin-datos">Sin datos.</p>`;

  const trazos = trazosAnillo(visibles.map((s) => s.cantidad));
  const c = ANILLO.lado / 2;

  const arcos = visibles
    .map(
      (s, i) =>
        `<circle cx="${c}" cy="${c}" r="${ANILLO.radio}" fill="none" stroke="${
          s.color
        }" stroke-width="${ANILLO.grosor}" stroke-dasharray="${
          trazos[i].dash
        }" stroke-dashoffset="${trazos[i].offset}"><title>${esc(
          s.etiqueta
        )}: ${s.cantidad} · ${s.pct}%</title></circle>`
    )
    .join("");

  const cifras = visibles
    .map((s, i) =>
      trazos[i].cabeEtiqueta
        ? `<text x="${trazos[i].etiqueta.x}" y="${
            trazos[i].etiqueta.y + 3.5
          }" text-anchor="middle" fill="${s.colorTexto}" font-size="${
            TIPOGRAFIA_ANILLO.cifraSegmento
          }" font-weight="600">${s.cantidad}</text>`
        : ""
    )
    .join("");

  return `<svg class="anillo" viewBox="0 0 ${ANILLO.lado} ${ANILLO.lado}" role="img" aria-label="${esc(
    visibles.map((s) => `${s.etiqueta}: ${s.cantidad}, ${s.pct}%`).join(". ")
  )}">
      <g transform="rotate(-90 ${c} ${c})">${arcos}</g>
      ${cifras}
      <text x="${c}" y="${c + 4}" text-anchor="middle" fill="var(--foreground)" font-size="${
        TIPOGRAFIA_ANILLO.cifraCentral
      }" font-weight="600">${total}</text>
      <text x="${c}" y="${c + 19}" text-anchor="middle" fill="var(--muted-foreground)" font-size="${
        TIPOGRAFIA_ANILLO.etiquetaCentral
      }">${total === 1 ? "proyecto" : "proyectos"}</text>
    </svg>`;
}

function leyendaHtml(segmentos: Segmento[]): string {
  return `<ul class="leyenda">${segmentos
    .filter((s) => s.cantidad > 0)
    .map(
      (s) =>
        `<li><span class="punto" style="background:${s.color}"></span>${esc(
          s.etiqueta
        )}</li>`
    )
    .join("")}</ul>`;
}

function columnasHtml(items: Columna[]): string {
  if (items.length === 0) return `<p class="sin-datos">Sin datos.</p>`;

  const tope = Math.max(...items.map((i) => i.valor), 1);
  const altoUtil = ALTO_COLUMNAS - 24;

  const barras = items
    .map(
      (i) => `<div class="columna" title="${esc(i.etiqueta)}: ${i.valor} · ${
        i.pct
      }%">
        <span class="columna-valor">${i.valor}</span>
        <span class="columna-barra" style="height:${Math.max(
          (i.valor / tope) * altoUtil,
          3
        )}px;max-width:${GROSOR_COLUMNA}px"></span>
      </div>`
    )
    .join("");

  const etiquetas = items
    .map((i) => `<span class="columna-etiqueta">${esc(i.etiqueta)}</span>`)
    .join("");

  return `<div class="columnas">
      <div class="columnas-plot" style="height:${ALTO_COLUMNAS}px">${barras}</div>
      <div class="eje"></div>
      <div class="columnas-etiquetas">${etiquetas}</div>
    </div>`;
}

/** Ver `BarrasProgreso` en la vista: escala fija al 100%, un solo tono. */
function progresoHtml(items: BarraProgreso[]): string {
  if (items.length === 0) return `<p class="sin-datos">Sin datos.</p>`;

  return `<ul class="progreso">${items
    .map((i) => {
      const dentro = i.avance >= MINIMO_ETIQUETA_DENTRO;
      const titulo = `${esc(i.etiqueta)}: ${i.avance}% · ${i.total} ${
        i.total === 1 ? "documento" : "documentos"
      }`;
      return `<li>
        <span class="progreso-nombre" title="${esc(i.etiqueta)}">${esc(
          i.etiqueta
        )}</span>
        <span class="progreso-pista">
          <span class="progreso-barra" style="width:${Math.max(
            i.avance,
            1
          )}%" title="${titulo}">${
            dentro ? `<b>${i.avance}%</b>` : ""
          }</span>
          ${dentro ? "" : `<b class="progreso-fuera">${i.avance}%</b>`}
        </span>
      </li>`;
    })
    .join("")}</ul>`;
}

/**
 * Tabla de respaldo. Todo gráfico del tablero tiene aquí su gemelo en texto:
 * es lo que hace legible el archivo para quien no distingue los colores, y lo
 * que permite buscar un proyecto concreto con Ctrl+F.
 */
function tablaHtml(detalle: FilaDetalle[]): string {
  if (detalle.length === 0) return `<p class="sin-datos">Sin documentos.</p>`;

  return `<div class="tabla-scroll"><table>
      <thead><tr>
        <th>Documento</th><th>Área</th><th>Proceso</th><th>Tipo</th>
        <th>Estado</th><th class="num">Avance</th><th>Enfoque</th>
      </tr></thead>
      <tbody>${detalle
        .map(
          (d) => `<tr>
          <td>${esc(d.nombre)}</td>
          <td>${esc(d.area)}</td>
          <td>${esc(d.proceso)}</td>
          <td>${esc(d.tipo)}</td>
          <td>${esc(d.estado)}</td>
          <td class="num">${d.avance}%</td>
          <td>${esc(d.responsable)}</td>
        </tr>`
        )
        .join("")}</tbody>
    </table></div>`;
}

// ------------------------------------------------------------------ Hoja

const ESTILOS = `
  :root {${TOKENS}}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--background);
    color: var(--foreground);
    font: 400 14px/1.45 "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hoja { max-width: 1120px; margin: 0 auto; padding: 28px 24px 48px; }

  .cabecera { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
  .cabecera .marca { display: flex; align-items: center; gap: 14px; }
  .cabecera .barra { width: 1px; align-self: stretch; background: var(--border); }
  .cabecera h1 { margin: 0; font-size: 21px; font-weight: 600; letter-spacing: -.01em; }
  .cabecera p { margin: 2px 0 0; font-size: 13px; color: var(--muted-foreground); }
  .cabecera .acciones { margin-left: auto; }
  button.imprimir {
    border: 1px solid var(--border); background: var(--card); color: var(--foreground);
    font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 999px; cursor: pointer;
  }
  button.imprimir:hover { background: var(--muted); }

  .rejilla { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .rejilla.una { grid-template-columns: 1fr; }
  .columna-tarjetas { display: flex; flex-direction: column; gap: 14px; }
  /* El anillo se centra en el alto que le deje la columna de al lado, en vez
     de quedarse pegado al título. */
  .anillo-centro { flex: 1; display: flex; align-items: center; }

  /* Sin \`break-inside: avoid\` aquí: puesto en todas las tarjetas, obliga al
     navegador a no partir tampoco la del detalle, que es más alta que una
     hoja. Como no puede cumplirlo, la desborda y se superpone con lo de
     abajo. Se aplica solo a las del tablero, dentro de @media print. */
  .tarjeta { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 20px; }
  .tarjeta-titulo h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .tarjeta-titulo p { margin: 3px 0 0; font-size: 12px; color: var(--muted-foreground); }
  .sin-datos { font-size: 12px; color: var(--muted-foreground); text-align: center; padding: 24px 0; margin: 0; }

  .leyenda { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 20px; font-size: 12px; color: var(--muted-foreground); }
  .leyenda li { display: flex; align-items: center; gap: 6px; }
  .punto { width: 8px; height: 8px; border-radius: 999px; flex: none; }

  .anillo { display: block; width: 100%; max-width: 380px; margin: 0 auto; }

  .columnas-plot { display: flex; align-items: flex-end; gap: 12px; }
  .columna { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 8px; }
  .columna-valor { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
  /* Un solo tono para todas: los tipos no son series distintas. */
  .columna-barra { width: 100%; border-radius: 4px 4px 0 0; background: var(--chart-1); }
  .eje { height: 1px; background: var(--grafico-eje); }
  .columnas-etiquetas { display: flex; gap: 12px; padding-top: 8px; }
  .columna-etiqueta { flex: 1; text-align: center; font-size: 12px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .progreso { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .progreso li { display: flex; align-items: center; gap: 12px; }
  /* Tope en píxeles además del porcentaje: en una tarjeta a todo lo ancho, un
     38% de columna de nombres deja las barras cortas y despegadas. */
  .progreso-nombre { width: 38%; max-width: 200px; flex: none; text-align: right; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .progreso-pista { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
  .progreso-barra { height: 28px; min-width: 3px; border-radius: 4px; background: var(--chart-1); display: flex; align-items: center; justify-content: flex-end; }
  .progreso-barra b { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: #fff; padding-right: 8px; }
  b.progreso-fuera { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--foreground); }

  .tabla-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted-foreground); font-weight: 500; white-space: nowrap; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:last-child td { border-bottom: 0; }

  .pie { margin-top: 18px; font-size: 12px; color: var(--muted-foreground); }

  @media (max-width: 860px) {
    .rejilla { grid-template-columns: 1fr; }
  }

  /* ------------------------------------------------------------ Impresión
     Dos hojas: el tablero completo en la primera, el detalle en la segunda.
     Es la separación natural del documento —un vistazo y su respaldo— y
     además evita el caso que rompía el PDF: tablero y tabla peleando por el
     mismo salto de página. */
  @media print {
    @page { size: A4 portrait; margin: 12mm; }
    body { background: #fff; }
    .hoja { max-width: none; padding: 0; }
    .acciones { display: none !important; }

    /* --- Hoja 1: el tablero ------------------------------------------- */
    /* En pantalla el tablero es una rejilla CSS; al imprimir pasa a tabla.
       No es capricho: Chrome fragmenta mal un grid en medios paginados —se
       come la columna derecha (el anillo desaparecía del PDF) y siembra hojas
       en blanco—, mientras que el maquetado por tabla es el que los motores
       de impresión llevan resolviendo desde siempre. */
    .rejilla { display: table; width: 100%; table-layout: fixed; margin: 0; }
    .rejilla > * { display: table-cell; vertical-align: top; }
    /* El canal entre columnas: \`gap\` no existe en una tabla, y
       \`border-spacing\` también separaría por fuera. */
    .columna-tarjetas { padding-right: 14px; }
    /* Y la separación vertical, que venía del \`gap\` del flex. */
    .columna-tarjetas .tarjeta + .tarjeta { margin-top: 14px; }

    .tablero { break-inside: avoid; }
    .tablero .tarjeta { border-color: #d7dfef; }
    /* Sin centrado elástico al imprimir: dentro de un contexto paginado el
       alto de un \`flex: 1\` puede resolverse a cero y el anillo desaparece. */
    .anillo-centro { display: block; }

    /* --- Hoja 2: el detalle ------------------------------------------- */
    .detalle { break-before: page; border-color: #d7dfef; }
    /* La tabla SÍ puede partirse: si un día hay 200 documentos tiene que
       repartirse en varias hojas en vez de salirse de la última. */
    .detalle, .detalle table { break-inside: auto; }
    /* \`overflow: auto\` recorta a la altura de la hoja al imprimir; en papel
       no hay barra de desplazamiento que valga. */
    .detalle .tabla-scroll { overflow: visible; }
    /* La cabecera se repite en cada hoja que ocupe la tabla. */
    thead { display: table-header-group; }
    /* Una fila nunca se parte por la mitad entre dos hojas. */
    tr { break-inside: avoid; }
    /* Los nombres largos se ajustan en vez de empujar la tabla fuera del
       ancho del papel. */
    td { overflow-wrap: anywhere; }
    /* En papel la tabla va más apretada que en pantalla: con el interlineado
       de la web, veintitantas filas se pasaban por poco de la hoja y partían
       en dos. Así entran unas cuarenta antes de necesitar una segunda. */
    .detalle table { font-size: 10px; }
    .detalle th, .detalle td { padding: 4px 8px; }

    .pie { break-inside: avoid; }
  }
`;

// ------------------------------------------------------------------ Salida

function fechaLarga(momento: Date): string {
  return momento.toLocaleString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `dashboard-proyectos-2026-08-31.html` */
export function nombreArchivoDashboard(momento = new Date()): string {
  const y = momento.getFullYear();
  const m = String(momento.getMonth() + 1).padStart(2, "0");
  const d = String(momento.getDate()).padStart(2, "0");
  return `dashboard-proyectos-${y}-${m}-${d}.html`;
}

export function generarHtmlDashboard(
  modelo: ModeloDashboard,
  momento = new Date()
): string {
  const nota = modelo.hayFiltros
    ? `Recorte filtrado: ${modelo.total} de ${modelo.totalSinFiltrar} documentos.`
    : `Cartera completa: ${modelo.totalSinFiltrar} ${
        modelo.totalSinFiltrar === 1 ? "documento" : "documentos"
      }.`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Estatus global de proyectos · ${esc(fechaLarga(momento))}</title>
<style>${ESTILOS}</style>
</head>
<body>
<div class="hoja">

  <header class="cabecera">
    <div class="marca">
      ${LOGO}
      <div class="barra"></div>
      <div>
        <h1>Estatus global de proyectos y soluciones</h1>
        <p>${esc(nota)} Generado el ${esc(fechaLarga(momento))}.</p>
      </div>
    </div>
    <div class="acciones">
      <button class="imprimir" onclick="window.print()">Imprimir o guardar en PDF</button>
    </div>
  </header>

  <!-- Dos tarjetas cortas apiladas a la izquierda y el anillo a la derecha:
       emparejarlas con el anillo —alto por naturaleza— evita el hueco muerto
       que dejarían solas en una fila. Al imprimir, todo esto es la hoja 1. -->
  <div class="tablero">
  <div class="rejilla">
    <div class="columna-tarjetas">
      ${tarjeta(
        "Distribución del portafolio por tipo",
        "Qué clase de entregables está produciendo el equipo.",
        columnasHtml(modelo.porTipo)
      )}
      ${tarjeta(
        "% de progreso por área",
        "Avance promedio de cada línea de negocio, de mayor a menor.",
        progresoHtml(modelo.progresoArea)
      )}
    </div>
    ${tarjeta(
      "Estatus general de los proyectos",
      `${modelo.avancePromedio}% de avance promedio de la cartera.`,
      `<div class="anillo-centro">${anilloHtml(
        modelo.estatus,
        modelo.total
      )}</div>${leyendaHtml(modelo.estatus)}`
    )}
  </div>
  </div>

  <!-- Al imprimir, esta tarjeta abre la hoja 2. -->
  <section class="tarjeta detalle">
    <header class="tarjeta-titulo">
      <h2>Detalle de actividades</h2>
      <p>Las ${modelo.total} ${
        modelo.total === 1 ? "actividad" : "actividades"
      } del tablero, una por fila.</p>
    </header>
    ${tablaHtml(modelo.detalle)}
  </section>

  <p class="pie">Documento autónomo generado desde la agenda de actividades. Es una foto del momento: para verlo actualizado, vuelve a generarlo.</p>

</div>
</body>
</html>`;
}

/**
 * Descarga el archivo. Se hace con un `Blob` local y no con una petición al
 * servidor porque el dashboard ya está calculado en el navegador: no hace falta
 * ida y vuelta, y así el botón funciona igual de bien sin conexión.
 */
export function descargarDashboard(modelo: ModeloDashboard): void {
  const momento = new Date();
  const blob = new Blob([generarHtmlDashboard(modelo, momento)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivoDashboard(momento);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El objeto se libera en el siguiente tick: revocarlo de inmediato aborta la
  // descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
