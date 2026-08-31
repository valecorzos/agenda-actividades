/**
 * Modelo de dominio del módulo de Documentos.
 *
 * Las fórmulas de `calcularAvanceGlobal` y `derivarEstado` son un espejo exacto
 * de las funciones `documentos_avance_global()` y `documentos_estado()` de
 * Postgres. La base de datos es la fuente de verdad; estas copias existen solo
 * para previsualizar el resultado en el formulario antes de guardar.
 */

// ---------------------------------------------------------------- Catálogos

export type LineaNegocio = {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  activo: boolean;
};

export type Proceso = {
  id: string;
  nombre: string;
  /** null = proceso transversal, disponible para todas las empresas. */
  linea_negocio_id: string | null;
  activo: boolean;
};

// ------------------------------------------------------------------- Enums

export const TIPOS_DOCUMENTO = [
  "App",
  "Dashboard",
  "Forms",
  "Excel",
  "Script",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const RESPONSABLES = ["Juan", "Valentina"] as const;
export type Responsable = (typeof RESPONSABLES)[number];

export const ESTADOS_DOCUMENTO = [
  "Sin iniciar",
  "En planificación",
  "En contexto",
  "En desarrollo",
  "Lista para TIC",
  "Entregada a TIC",
  "En producción",
] as const;
export type EstadoDocumento = (typeof ESTADOS_DOCUMENTO)[number];

// --------------------------------------------------------------- Documento

/** Fila de la vista `v_documentos_detalle`. */
export type Documento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoDocumento;
  linea_negocio_id: string;
  linea_negocio: string;
  linea_negocio_color: string;
  proceso_id: string;
  proceso: string;
  pct_planificacion: number;
  pct_contexto: number;
  pct_desarrollo: number;
  entregado_tic: boolean;
  fecha_entrega_tic: string | null;
  en_produccion: boolean;
  fecha_produccion: string | null;
  responsable: Responsable | null;
  /** Columna generada en Postgres. Nunca se envía al guardar. */
  avance_global: number;
  /** Columna generada en Postgres. Nunca se envía al guardar. */
  estado: EstadoDocumento;
  fecha_inicio: string;
  dias_en_curso: number;
  dias_sin_movimiento: number;
  estancado: boolean;
  mantenimientos_total: number;
  mantenimientos_abiertos: number;
  created_at: string;
  updated_at: string;
};

/** Campos que la aplicación sí puede escribir. */
export type DocumentoInput = {
  linea_negocio_id: string;
  proceso_id: string;
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string | null;
  pct_planificacion: number;
  pct_contexto: number;
  pct_desarrollo: number;
  entregado_tic: boolean;
  en_produccion: boolean;
  responsable: Responsable | null;
};

// --------------------------------------------------------- Mantenimientos

export const CLASES_MANTENIMIENTO = [
  "Correctivo",
  "Mejora",
  "Actualización",
] as const;
export type ClaseMantenimiento = (typeof CLASES_MANTENIMIENTO)[number];

export const ESTADOS_MANTENIMIENTO = ["Abierto", "En curso", "Cerrado"] as const;
export type EstadoMantenimiento = (typeof ESTADOS_MANTENIMIENTO)[number];

export type Mantenimiento = {
  id: string;
  documento_id: string;
  titulo: string;
  descripcion: string | null;
  clase: ClaseMantenimiento;
  estado: EstadoMantenimiento;
  responsable: Responsable | null;
  fecha_solicitud: string;
  /** La rellena y la limpia un trigger según el estado. */
  fecha_cierre: string | null;
  created_at: string;
  updated_at: string;
};

export type MantenimientoInput = {
  documento_id: string;
  titulo: string;
  descripcion: string | null;
  clase: ClaseMantenimiento;
  estado: EstadoMantenimiento;
  responsable: Responsable | null;
};

/** Qué significa cada clase, para el desplegable del formulario. */
export const AYUDA_CLASE: Record<ClaseMantenimiento, string> = {
  Correctivo: "Algo se rompió y hay que arreglarlo.",
  Mejora: "Piden funcionalidad nueva sobre lo ya entregado.",
  Actualización: "Mantenimiento técnico, sin cambio funcional visible.",
};

export const CLASES_ESTADO_MANTENIMIENTO: Record<EstadoMantenimiento, string> = {
  Abierto: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  "En curso": "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  Cerrado: "bg-muted text-muted-foreground",
};

/** Fila de `documento_historial`, para los gráficos de velocidad. */
export type MovimientoHistorial = {
  id: string;
  documento_id: string;
  documento_nombre: string;
  linea_negocio_nombre: string;
  proceso_nombre: string;
  tipo: TipoDocumento;
  responsable: Responsable | null;
  entregado_tic: boolean;
  en_produccion: boolean;
  avance_global: number;
  estado: EstadoDocumento;
  delta_avance: number;
  registrado_at: string;
};

// ------------------------------------------------------------------- Fases

export type ClaveFase = "planificacion" | "contexto" | "desarrollo";

export const FASES: {
  clave: ClaveFase;
  campo: "pct_planificacion" | "pct_contexto" | "pct_desarrollo";
  etiqueta: string;
  abreviatura: string;
  peso: number;
  ayuda: string;
}[] = [
  {
    clave: "planificacion",
    campo: "pct_planificacion",
    etiqueta: "Planificación",
    abreviatura: "Plan",
    peso: 0.2,
    ayuda: "Alcance definido, requerimientos y cronograma acordados.",
  },
  {
    clave: "contexto",
    campo: "pct_contexto",
    etiqueta: "Contexto",
    abreviatura: "Ctx",
    peso: 0.2,
    ayuda: "Levantamiento con el área: reglas de negocio y datos fuente.",
  },
  {
    clave: "desarrollo",
    campo: "pct_desarrollo",
    etiqueta: "Desarrollo",
    abreviatura: "Des",
    peso: 0.4,
    ayuda: "Construcción efectiva del entregable.",
  },
];

/** Peso del hito de entrega a TIC dentro del avance global. */
export const PESO_ENTREGA_TIC = 0.1;

/** Peso del hito de puesta en producción. Cierra el 100%. */
export const PESO_PRODUCCION = 0.1;

/**
 * Espejo de `documentos_avance_global()`.
 *
 * Los dos hitos finales valen 10% cada uno, así que un documento no llega a
 * 100% hasta que está corriendo en producción: entregarlo a TIC lo deja en 90%.
 * Terminar de construir algo y que nadie lo use todavía no es estar terminado.
 */
export function calcularAvanceGlobal(
  planificacion: number,
  contexto: number,
  desarrollo: number,
  entregadoTic: boolean,
  enProduccion: boolean
): number {
  return Math.round(
    planificacion * 0.2 +
      contexto * 0.2 +
      desarrollo * 0.4 +
      (entregadoTic ? 100 : 0) * PESO_ENTREGA_TIC +
      (enProduccion ? 100 : 0) * PESO_PRODUCCION
  );
}

/** Espejo de `documentos_estado()`. */
export function derivarEstado(
  planificacion: number,
  contexto: number,
  desarrollo: number,
  entregadoTic: boolean,
  enProduccion: boolean
): EstadoDocumento {
  if (enProduccion) return "En producción";
  if (entregadoTic) return "Entregada a TIC";
  if (desarrollo >= 100) return "Lista para TIC";
  if (desarrollo > 0) return "En desarrollo";
  if (contexto > 0) return "En contexto";
  if (planificacion > 0) return "En planificación";
  return "Sin iniciar";
}

// ------------------------------------------------------- Presentación

/** Clases de badge por estado. Un solo lugar para el semáforo de la app. */
export const CLASES_ESTADO: Record<EstadoDocumento, string> = {
  "Sin iniciar": "bg-muted text-muted-foreground",
  "En planificación":
    "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
  "En contexto":
    "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  "En desarrollo":
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  "Lista para TIC":
    "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "Entregada a TIC":
    "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
  "En producción":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
};

/**
 * Color de cada tipo de entregable. El orden es fijo y no se recicla: si un
 * filtro deja fuera a "Forms", los demás tipos conservan su color en vez de
 * correrse una posición.
 */
export const COLOR_TIPO: Record<TipoDocumento, string> = {
  App: "var(--chart-1)",
  Dashboard: "var(--chart-2)",
  Forms: "var(--chart-3)",
  Excel: "var(--chart-4)",
  Script: "var(--chart-5)",
};

/** Color de cada fase dentro de la rampa ordinal. */
export const COLOR_FASE: Record<ClaveFase | "tic" | "produccion", string> = {
  planificacion: "var(--fase-planificacion)",
  contexto: "var(--fase-contexto)",
  desarrollo: "var(--fase-desarrollo)",
  tic: "var(--fase-tic)",
  produccion: "var(--fase-produccion)",
};

/**
 * Enfoque: azul para Juan, rosado para Valentina.
 * Los colores viven en `globals.css` para que gráficos y badges no se
 * desincronicen nunca.
 */
export const ENFOQUE: Record<
  Responsable,
  { color: string; suave: string; texto: string }
> = {
  Juan: {
    color: "var(--enfoque-juan)",
    suave: "var(--enfoque-juan-suave)",
    texto: "var(--enfoque-juan-texto)",
  },
  Valentina: {
    color: "var(--enfoque-valentina)",
    suave: "var(--enfoque-valentina-suave)",
    texto: "var(--enfoque-valentina-texto)",
  },
};

/** Umbral, en días sin movimiento, a partir del cual un documento se marca estancado. */
export const DIAS_PARA_ESTANCADO = 21;

/** Paleta sugerida al crear una línea de negocio. Ver `globals.css`. */
export const COLORES_CATALOGO = [
  "#1067f2",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#1e2e5a",
];

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";
  // Las fechas llegan como 'YYYY-MM-DD'; se parsean a mano para evitar el
  // corrimiento de un día que provoca `new Date('YYYY-MM-DD')` en UTC.
  const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
