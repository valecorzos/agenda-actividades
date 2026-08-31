/**
 * Modelo del dashboard.
 *
 * Una sola función pura convierte los documentos visibles en las series que
 * dibujan las cuatro tarjetas. Vive fuera de los componentes porque tiene dos
 * consumidores: la vista de React y el generador de HTML autónomo
 * (`exportar-html.ts`). Mientras los dos lean de aquí, el archivo que se
 * descarga no puede contradecir lo que muestra la pantalla.
 *
 * Los colores viajan como `var(--token)`, no como hex. La página exportada
 * declara los mismos tokens en su propio `:root`, así que la misma cadena
 * pinta igual en los dos sitios y nadie tiene que mantener dos paletas.
 */

import { COLOR_FASE, TIPOS_DOCUMENTO } from "@/lib/documentos";
import type { Documento, EstadoDocumento } from "@/lib/documentos";

// ------------------------------------------------------------------ Tramos

/**
 * Los siete estados del dominio se resumen en tres tramos.
 *
 * Tres y no cinco: el anillo responde una sola pregunta —¿en qué punto está la
 * cartera?— y con cinco porciones había que descifrar la leyenda para
 * contestarla. El detalle estado por estado sigue estando en la tabla de
 * documentos, que es donde se va a buscarlo.
 *
 * "En contexto" no tiene porción propia, por pedido expreso: es una etapa de
 * definición, así que cuenta como planificación.
 *
 * La rampa es ordinal —un solo tono, de claro a oscuro— porque los tramos son
 * etapas de un mismo recorrido, no identidades distintas. El orden del arreglo
 * es el del recorrido y el del anillo.
 */
export const TRAMOS_ESTATUS: {
  clave: string;
  etiqueta: string;
  color: string;
  /** Tinta de la cifra escrita sobre el arco, elegida por luminancia. */
  colorTexto: string;
  estados: EstadoDocumento[];
}[] = [
  {
    clave: "planificacion",
    etiqueta: "En planificación",
    color: COLOR_FASE.planificacion,
    colorTexto: "var(--foreground)",
    estados: ["Sin iniciar", "En planificación", "En contexto"],
  },
  {
    clave: "desarrollo",
    etiqueta: "En desarrollo",
    color: COLOR_FASE.desarrollo,
    colorTexto: "#ffffff",
    estados: ["En desarrollo", "Lista para TIC"],
  },
  {
    clave: "completado",
    etiqueta: "Completado",
    color: COLOR_FASE.produccion,
    colorTexto: "#ffffff",
    estados: ["Entregada a TIC", "En producción"],
  },
];

// -------------------------------------------------------------------- Tipos

export type Segmento = {
  clave: string;
  etiqueta: string;
  cantidad: number;
  pct: number;
  color: string;
  colorTexto: string;
};

export type Columna = {
  clave: string;
  etiqueta: string;
  valor: number;
  pct: number;
};

export type BarraProgreso = {
  clave: string;
  etiqueta: string;
  /** Avance promedio del grupo, 0–100. */
  avance: number;
  total: number;
};

export type FilaDetalle = {
  nombre: string;
  area: string;
  proceso: string;
  tipo: string;
  estado: string;
  avance: number;
  responsable: string;
};

export type ModeloDashboard = {
  total: number;
  totalSinFiltrar: number;
  hayFiltros: boolean;
  avancePromedio: number;
  estatus: Segmento[];
  porTipo: Columna[];
  progresoArea: BarraProgreso[];
  detalle: FilaDetalle[];
};

// ----------------------------------------------------------------- Cálculo

function promedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);
}

export function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

/**
 * Avance promedio por grupo, de mayor a menor. Una sola medida por fila: es la
 * lectura que se pidió —"% de progreso"— y la que se contesta de un vistazo.
 *
 * Está parametrizada por la clave de agrupación aunque hoy solo la llame la
 * línea de negocio: agrupar por proceso, o por responsable, es una línea.
 */
function progresoPor(
  documentos: Documento[],
  clave: (d: Documento) => string
): BarraProgreso[] {
  const grupos = new Map<string, Documento[]>();
  for (const d of documentos) {
    const k = clave(d);
    const lista = grupos.get(k);
    if (lista) lista.push(d);
    else grupos.set(k, [d]);
  }

  return [...grupos.entries()]
    .map(([nombre, docs]) => ({
      clave: nombre,
      etiqueta: nombre,
      avance: promedio(docs.map((d) => d.avance_global)),
      total: docs.length,
    }))
    .sort((a, b) => b.avance - a.avance || a.etiqueta.localeCompare(b.etiqueta));
}

export function construirModelo(
  visibles: Documento[],
  totalSinFiltrar: number,
  hayFiltros: boolean
): ModeloDashboard {
  const total = visibles.length;

  const estatus: Segmento[] = TRAMOS_ESTATUS.map((t) => {
    const cantidad = visibles.filter((d) => t.estados.includes(d.estado)).length;
    return {
      clave: t.clave,
      etiqueta: t.etiqueta,
      cantidad,
      pct: porcentaje(cantidad, total),
      color: t.color,
      colorTexto: t.colorTexto,
    };
  });

  // Orden fijo del catálogo, no por tamaño: así los tipos no se reordenan al
  // filtrar y la columna de cada uno se busca siempre en el mismo sitio.
  //
  // Sin color por tipo: es una sola serie —cuántos documentos hay de cada
  // clase— y la altura ya lo dice. Pintar cada columna de un color distinto
  // gastaría el canal de identidad en repetir lo que la barra muestra.
  const porTipo: Columna[] = TIPOS_DOCUMENTO.map((t) => {
    const valor = visibles.filter((d) => d.tipo === t).length;
    return {
      clave: t,
      etiqueta: t,
      valor,
      pct: porcentaje(valor, total),
    };
  }).filter((c) => c.valor > 0);

  return {
    total,
    totalSinFiltrar,
    hayFiltros,
    avancePromedio: promedio(visibles.map((d) => d.avance_global)),
    estatus,
    porTipo,
    progresoArea: progresoPor(visibles, (d) => d.linea_negocio),
    detalle: [...visibles]
      .sort((a, b) => b.avance_global - a.avance_global)
      .map((d) => ({
        nombre: d.nombre,
        area: d.linea_negocio,
        proceso: d.proceso,
        tipo: d.tipo,
        estado: d.estado,
        avance: d.avance_global,
        responsable: d.responsable ?? "Sin asignar",
      })),
  };
}
