/**
 * Reporte imprimible de documentos.
 *
 * Genera una hoja HTML autónoma —sin CDN, sin fuentes remotas, sin consultas a
 * la base— con los documentos que se marcaron en la tabla, y la abre en una
 * ventana nueva con el diálogo de impresión ya levantado. Desde ahí, "Guardar
 * como PDF" produce el archivo.
 *
 * Por qué así y no con una librería de PDF: el motor de impresión del navegador
 * ya sabe paginar, repetir cabeceras de tabla y respetar los colores. Una
 * librería tipo jsPDF obligaría a maquetar todo a mano en coordenadas, pesaría
 * más que el resto de la aplicación junta y no se parecería a la pantalla, que
 * era justo lo que se pedía.
 *
 * Los colores salen de los mismos tokens de `globals.css` (ver `marca.ts`), así
 * que el papel no puede decir un color distinto del que se vio en la tabla.
 *
 * Es una sola hoja apaisada con el listado, nada más. Antes el reporte incluía
 * además un resumen en cifras y una ficha por documento en una segunda hoja
 * vertical; mezclar en el mismo PDF páginas verticales y apaisadas (con
 * `@page` nombradas) es lo que hacía que Chrome rotara el texto de la tabla al
 * imprimir. Con una única orientación en todo el documento el bug desaparece.
 */

import {
  COLOR_AVANCE,
  COLOR_CLASE_MANTENIMIENTO,
  COLOR_ESTADO_IMPRESION,
  COLOR_ESTADO_MANTENIMIENTO_IMPRESION,
  COLOR_TIPO,
  ENFOQUE,
  entregaDeDocumento,
  entregaDeMantenimiento,
  formatearFecha,
  semaforoEntrega,
} from "@/lib/documentos";
import type { DatosEntrega, Documento, Mantenimiento, Responsable } from "@/lib/documentos";
import {
  LOGO,
  TOKENS,
  esc,
  fechaLarga,
  selloFecha,
} from "@/lib/reportes/marca";

// ------------------------------------------------------------------ Piezas

/**
 * Badge de un texto con su color. Sirve para el estado del documento y el del
 * mantenimiento: los dos son un texto corto con un par {texto, fondo}, solo
 * cambia de qué tabla de colores sale cada uno.
 */
function badgeColor(texto: string, color: { texto: string; fondo: string }): string {
  return `<span class="badge" style="background:${color.fondo};color:${
    color.texto
  }">${esc(texto)}</span>`;
}

/**
 * Un punto de color delante de su etiqueta.
 *
 * El punto no es un elemento aparte sino el fondo del propio texto, y esa es
 * toda la gracia: una bolita en su propio `<span>` sería un inline-block, y un
 * inline-block es un sitio por el que el navegador puede cortar el renglón. En
 * una columna estrecha eso dejaba "Dashboard" abajo y el punto solo arriba,
 * como una viñeta huérfana. Pintado como fondo no hay por dónde cortar, y la
 * etiqueta conserva sus propios puntos de corte: "Alimentos Balanceados del
 * Oriente" sigue partiéndose entre palabras, que es donde debe.
 */
function etiquetaConPunto(color: string, texto: string): string {
  return `<span class="punteada" style="--punto:${color}">${esc(texto)}</span>`;
}

/** Chip del enfoque. Sin responsable no se pinta color: no hay a quién. */
function chipEnfoque(responsable: Responsable | null): string {
  if (!responsable) return `<span class="vacio">Sin asignar</span>`;
  const paleta = ENFOQUE[responsable];
  return `<span class="badge" style="background:${paleta.suave};color:${
    paleta.texto
  }">${esc(responsable)}</span>`;
}

/**
 * "13 sept 2026". El "de ... de" que pone `formatearFecha` cuesta un renglón
 * entero en la celda de la tabla, que compite con otras ocho columnas.
 */
function fechaCorta(fecha: string | null): string {
  return formatearFecha(fecha).replace(/ de /g, " ");
}

/**
 * Fecha comprometida + plazo: rojo si se venció, ámbar si está encima.
 * Sirve tanto para el documento como para un mantenimiento —los dos llegan a
 * la misma forma `DatosEntrega`, ver `entregaDeDocumento`/`entregaDeMantenimiento`.
 */
function badgeEntrega(entrega: DatosEntrega): string {
  const semaforo = semaforoEntrega(entrega);
  if (semaforo.tono === "sin-fecha")
    return `<span class="vacio">Sin fecha</span>`;

  const destacado = semaforo.impresion.fondo !== "transparent";
  return `<span class="entrega">
      <span class="entrega-fecha">${esc(
        fechaCorta(entrega.fecha_estimada_entrega)
      )}</span>
      <span class="${destacado ? "badge" : "plazo"}" style="${
        destacado
          ? `background:${semaforo.impresion.fondo};color:${semaforo.impresion.texto}`
          : `color:${semaforo.impresion.texto}`
      }">${esc(semaforo.plazo)}</span>
    </span>`;
}

/**
 * Barra de avance con su porcentaje debajo: un solo color, verde cuando el
 * documento ya está en producción. Misma decisión que en pantalla —ver
 * `COLOR_AVANCE`—, para que el papel y la tabla no se contradigan.
 */
function avance(valor: number, terminado: boolean): string {
  const color = terminado ? COLOR_AVANCE.terminado : COLOR_AVANCE.enCurso;
  return `<span class="avance">
      <span class="barra"><span style="width:${valor}%;background:${color}"></span></span>
      <b>${valor}%</b>
    </span>`;
}

// ------------------------------------------------------------------- Tabla

/**
 * Las nueve columnas del listado, cada una con el ancho que le toca.
 *
 * El reparto es fijo —la tabla va en `table-layout: fixed`— y no automático a
 * propósito: dejándoselo al navegador, reparte según el contenido y las
 * columnas de texto largo estrujan a las cortas hasta que "Dashboard" sale
 * partido en tres renglones de tres letras. Los porcentajes suman 100.
 */
const COLUMNAS: { titulo: string; ancho: string; clase?: string }[] = [
  { titulo: "#", ancho: "3%", clase: "indice" },
  { titulo: "Documento", ancho: "22%", clase: "nombre" },
  { titulo: "Línea de negocio", ancho: "14%" },
  { titulo: "Proceso", ancho: "12%" },
  { titulo: "Tipo", ancho: "9%" },
  { titulo: "Estatus", ancho: "11%" },
  { titulo: "Avance", ancho: "8%", clase: "avance" },
  { titulo: "Entrega estimada", ancho: "12%" },
  { titulo: "Enfoque", ancho: "9%" },
];

/**
 * Sub-fila bajo un documento, una por cada mantenimiento abierto o en curso.
 *
 * Existe para el caso que motivó el reporte: un documento ya "En producción"
 * puede tener un mantenimiento pedido y en marcha, y eso hay que verlo sin
 * abrir el panel del documento. Lleva las mismas nueve columnas que la fila
 * del documento —Tipo pasa a ser la clase del mantenimiento, Estatus y Avance
 * son los suyos propios, y la fecha de Entrega estimada es la del
 * mantenimiento, no la del documento, que ya se cumplió hace tiempo—, para que
 * se lea como una fila más y no como una nota aparte.
 */
function filaMantenimiento(m: Mantenimiento): string {
  return `<tr class="fila-mantenimiento">
        <td class="indice"></td>
        <td class="nombre">
          <span class="mantenimiento-etiqueta">Mantenimiento</span>
          ${esc(m.titulo)}
        </td>
        <td><span class="vacio">—</span></td>
        <td><span class="vacio">—</span></td>
        <td>${etiquetaConPunto(COLOR_CLASE_MANTENIMIENTO[m.clase], m.clase)}</td>
        <td>${badgeColor(m.estado, COLOR_ESTADO_MANTENIMIENTO_IMPRESION[m.estado])}</td>
        <td class="avance">${avance(m.progreso, m.estado === "Cerrado")}</td>
        <td>${badgeEntrega(entregaDeMantenimiento(m))}</td>
        <td>${chipEnfoque(m.responsable)}</td>
      </tr>`;
}

function tablaHtml(
  documentos: Documento[],
  mantenimientosPorDocumento: Record<string, Mantenimiento[]>
): string {
  const reparto = COLUMNAS.map(
    (c) => `<col style="width:${c.ancho}">`
  ).join("");

  const encabezado = COLUMNAS.map(
    (c) => `<th${c.clase ? ` class="${c.clase}"` : ""}>${esc(c.titulo)}</th>`
  ).join("");

  const filas = documentos
    .map((d, i) => {
      const filaDocumento = `<tr>
        <td class="indice">${i + 1}</td>
        <td class="nombre">${esc(d.nombre)}</td>
        <td>${etiquetaConPunto(d.linea_negocio_color, d.linea_negocio)}</td>
        <td>${esc(d.proceso)}</td>
        <td>${etiquetaConPunto(COLOR_TIPO[d.tipo], d.tipo)}</td>
        <td>${badgeColor(d.estado, COLOR_ESTADO_IMPRESION[d.estado])}</td>
        <td class="avance">${avance(d.avance_global, d.en_produccion)}</td>
        <td>${badgeEntrega(entregaDeDocumento(d))}</td>
        <td>${chipEnfoque(d.responsable)}</td>
      </tr>`;
      const filasMantenimiento = (mantenimientosPorDocumento[d.id] ?? [])
        .map(filaMantenimiento)
        .join("");
      return filaDocumento + filasMantenimiento;
    })
    .join("");

  return `<table class="listado">
      <colgroup>${reparto}</colgroup>
      <thead><tr>${encabezado}</tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
}

// -------------------------------------------------------------------- Hoja

const ESTILOS = `
  :root {${TOKENS}}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--background);
    color: var(--foreground);
    font: 400 13px/1.45 "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hoja { max-width: 1200px; margin: 0 auto; padding: 28px 24px 48px; }

  .cabecera { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
  .cabecera .marca { display: flex; align-items: center; gap: 14px; }
  .cabecera .divisor { width: 1px; align-self: stretch; background: var(--border); }
  .cabecera h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -.01em; }
  .cabecera p { margin: 3px 0 0; font-size: 12px; color: var(--muted-foreground); }
  .acciones { margin-left: auto; }
  button.imprimir {
    border: 1px solid var(--border); background: var(--card); color: var(--foreground);
    font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 999px; cursor: pointer;
  }
  button.imprimir:hover { background: var(--muted); }

  h2.seccion { margin: 0 0 10px; font-size: 13px; font-weight: 600; }
  h2.seccion span { font-weight: 400; color: var(--muted-foreground); }

  /* ------------------------------------------------------------- Piezas */
  .punteada {
    padding-left: 13px;
    background: radial-gradient(circle closest-side, var(--punto) 99%, transparent 100%)
      no-repeat 0 .48em / 7px 7px;
  }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; }
  .plazo { font-size: 11px; white-space: nowrap; }
  .vacio { color: var(--muted-foreground); font-size: 11px; }
  .entrega { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .entrega-fecha { white-space: nowrap; }

  /* Barra de avance: un solo color, el mismo que usa la aplicación. */
  .barra { display: block; width: 100%; height: 7px; background: var(--muted); border-radius: 999px; overflow: hidden; }
  .barra > span { display: block; height: 100%; border-radius: 999px; }
  span.avance { display: flex; flex-direction: column; gap: 3px; }
  span.avance b { font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; }

  /* -------------------------------------------------------------- Tabla */
  .tarjeta { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
  table.listado { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  .listado th, .listado td { text-align: left; padding: 7px 9px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .listado th { font-size: 10.5px; font-weight: 500; color: var(--muted-foreground); white-space: nowrap; }
  .listado tbody tr:last-child td { border-bottom: 0; }
  .listado .indice { text-align: right; color: var(--muted-foreground); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .listado td.nombre { font-weight: 600; }
  /* Parte una palabra solo cuando ella sola no cabe en la columna. Con
     'anywhere' el navegador parte por gusto, para estrechar la columna todo lo
     que pueda, y los nombres largos salen troceados en sílabas. */
  .listado td { overflow-wrap: break-word; }

  /* Sub-fila de mantenimiento: mismas columnas que la fila del documento, con
     un fondo distinto para que se lea como algo colgado de la fila de arriba
     y no como otro documento suelto. */
  .fila-mantenimiento td { background: var(--muted); }
  .fila-mantenimiento .mantenimiento-etiqueta {
    display: block; font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .03em; color: var(--primary); margin-bottom: 1px;
  }

  /* ---------------------------------------------------------- Impresión
     Una sola hoja, siempre apaisada: nueve columnas de contenido real no
     caben en los 186 mm útiles de un A4 vertical sin trocear los nombres.

     El margen de la @page va en 0: es la única forma de que Chrome no
     reserve ese hueco para su cabecera y pie de impresión (la fecha, el
     "about:blank" y el título de la pestaña). El margen visual que antes
     ponía esa @page se reparte ahora como padding del propio .hoja.

     El print-color-adjust de más abajo se repite sobre el selector universal:
     puesto solo en body debería bastar por herencia, pero Edge y algunas
     versiones de Chrome no siempre lo respetan sobre los fondos de los
     badges y la barra de avance si no está también en el propio elemento.
     Repetirlo aquí es lo que saca el PDF a color aunque el usuario tenga
     desmarcada la opción "Gráficos de fondo" del diálogo de impresión. */
  @media print {
    @page { size: A4 landscape; margin: 0; }

    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff; }
    .hoja { max-width: none; padding: 12mm; }
    .acciones { display: none !important; }

    .tarjeta { border-color: #d7dfef; padding: 14px; }
    /* La tabla sí puede partirse entre hojas —con cien documentos no queda
       otra—, pero una fila nunca se corta por la mitad y la cabecera se repite
       arriba de cada hoja. */
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    /* El reparto del <colgroup> manda: sin 'fixed' el navegador lo toma como
       una sugerencia y vuelve a repartir por contenido. */
    .listado { table-layout: fixed; font-size: 10px; }
    .listado th, .listado td { padding: 5px 8px; }
    .listado th { white-space: normal; }
    .listado .badge, .listado .plazo, .listado .vacio { font-size: 9.5px; }
    .listado .badge { padding: 2px 6px; white-space: normal; }
    .listado .punteada { padding-left: 12px; }
    .fila-mantenimiento .mantenimiento-etiqueta { font-size: 8px; }
  }
`;

// ------------------------------------------------------------------ Salida

/** `documentos-2026-09-11.html`, para cuando toca descargarlo en vez de imprimirlo. */
export function nombreArchivoReporte(momento = new Date()): string {
  return `documentos-${selloFecha(momento)}.html`;
}

export function generarHtmlReporte(
  documentos: Documento[],
  mantenimientosPorDocumento: Record<string, Mantenimiento[]> = {},
  momento = new Date(),
  autoImprimir = false
): string {
  const total = documentos.length;

  const autoScript = autoImprimir
    ? `<script>window.addEventListener("load",function(){window.focus();window.print();});</script>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documentos ${esc(selloFecha(momento))}</title>
<style>${ESTILOS}</style>
</head>
<body>
<div class="hoja">

  <header class="cabecera">
    <div class="marca">
      ${LOGO}
      <div class="divisor"></div>
      <div>
        <h1>Reporte de documentos</h1>
        <p>${esc(total)} ${
          total === 1 ? "documento seleccionado" : "documentos seleccionados"
        } · Generado el ${esc(fechaLarga(momento))}.</p>
      </div>
    </div>
    <div class="acciones">
      <button class="imprimir" onclick="window.print()">Imprimir o guardar en PDF</button>
    </div>
  </header>

  <section class="tarjeta">
    <h2 class="seccion">Listado <span>· una fila por documento</span></h2>
    ${tablaHtml(documentos, mantenimientosPorDocumento)}
  </section>


</div>
${autoScript}
</body>
</html>`;
}

/** Descarga el reporte como archivo, para cuando la ventana nueva viene bloqueada. */
function descargarReporte(html: string, momento: Date): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivoReporte(momento);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El objeto se libera en el siguiente tick: revocarlo de inmediato aborta la
  // descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ResultadoReporte = "impreso" | "descargado";

/**
 * Abre la ventana en blanco donde va a caer el reporte.
 *
 * Se separa de `imprimirReporteDocumentos` porque el reporte necesita antes
 * una consulta a la base (los mantenimientos abiertos), y `window.open` solo
 * escapa al bloqueador de pop-ups si el navegador lo ve como reacción directa
 * al clic del usuario. Si se abriera después de un `await`, ya no hay clic
 * reciente encima y el bloqueador la para siempre —incluso en Chrome, que es
 * permisivo con esto. Abriéndola aquí, en el mismo `onClick`, y rellenándola
 * después con `imprimirReporteDocumentos`, la ventana sí cuenta como
 * originada por el usuario.
 */
export function abrirVentanaReporte(): Window | null {
  return window.open("", "_blank");
}

/**
 * Escribe el reporte en `ventana` —abierta de antemano con
 * `abrirVentanaReporte`— y levanta ahí el diálogo de impresión, que es donde
 * está "Guardar como PDF".
 *
 * Se usa una ventana y no un `<iframe>` oculto porque el navegador toma el
 * nombre propuesto para el PDF del título del documento que imprime: con el
 * iframe saldría con el título de la aplicación.
 *
 * Si el bloqueador de ventanas emergentes impidió abrirla (`ventana` es
 * `null`), cae a descargar el mismo HTML: doble clic y el botón de imprimir
 * está ahí dentro.
 */
export function imprimirReporteDocumentos(
  documentos: Documento[],
  mantenimientosPorDocumento: Record<string, Mantenimiento[]>,
  ventana: Window | null
): ResultadoReporte {
  const momento = new Date();

  if (!ventana) {
    descargarReporte(
      generarHtmlReporte(documentos, mantenimientosPorDocumento, momento, false),
      momento
    );
    return "descargado";
  }

  ventana.document.write(
    generarHtmlReporte(documentos, mantenimientosPorDocumento, momento, true)
  );
  ventana.document.close();
  return "impreso";
}
