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
  /** Para cuándo se comprometió. null = sin fecha pactada. */
  fecha_estimada_entrega: string | null;
  /** Con signo: positivo quedan días, 0 vence hoy, negativo se pasó. */
  dias_para_entrega: number | null;
  entrega_vencida: boolean;
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
  /** Cuándo se empezó de verdad, no cuándo se registró. La escribe el usuario. */
  fecha_inicio: string;
  fecha_estimada_entrega: string | null;
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

/** Fila de la vista `v_mantenimientos_detalle`. */
export type Mantenimiento = {
  id: string;
  documento_id: string;
  titulo: string;
  descripcion: string | null;
  clase: ClaseMantenimiento;
  /**
   * Derivado en Postgres a partir del progreso y la fecha de inicio. No se
   * edita a mano: el formulario no lo manda nunca.
   */
  estado: EstadoMantenimiento;
  responsable: Responsable | null;
  /** Avance del mantenimiento, 0-100. Es lo que decide el estado. */
  progreso: number;
  /** Cuándo lo pidieron. */
  fecha_solicitud: string;
  /** Cuándo se empezó de verdad. null = todavía no se ha empezado. */
  fecha_inicio: string | null;
  fecha_estimada_entrega: string | null;
  /** La rellena y la limpia un trigger según el estado. */
  fecha_cierre: string | null;
  /** Con signo: positivo quedan días, 0 vence hoy, negativo se pasó. */
  dias_para_entrega: number | null;
  entrega_vencida: boolean;
  /** Desde la fecha de inicio real contra hoy. null si no ha empezado. */
  dias_en_curso: number | null;
  created_at: string;
  updated_at: string;
};

/** Campos que la aplicación sí puede escribir. `estado` no está: lo deriva la base. */
export type MantenimientoInput = {
  documento_id: string;
  titulo: string;
  descripcion: string | null;
  clase: ClaseMantenimiento;
  responsable: Responsable | null;
  progreso: number;
  fecha_solicitud: string;
  fecha_inicio: string | null;
  fecha_estimada_entrega: string | null;
};

/**
 * Espejo de `mantenimientos_normalizar_cierre()`.
 *
 * La base es la fuente de verdad; esta copia existe solo para que el badge de
 * la lista cambie en el mismo clic que mueve el progreso, sin esperar a la
 * recarga. Tener fecha de inicio ya cuenta como "En curso": alguien lo está
 * trabajando aunque todavía marque 0%.
 */
export function derivarEstadoMantenimiento(
  progreso: number,
  fechaInicio: string | null
): EstadoMantenimiento {
  if (progreso >= 100) return "Cerrado";
  if (progreso > 0 || fechaInicio !== null) return "En curso";
  return "Abierto";
}

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
 * El mismo semáforo, en colores literales: el reporte impreso no tiene
 * Tailwind ni modo oscuro, así que necesita los valores en claro. Si un estado
 * cambia de color arriba, hay que cambiarlo también aquí.
 */
export const COLOR_ESTADO_IMPRESION: Record<
  EstadoDocumento,
  { texto: string; fondo: string }
> = {
  "Sin iniciar": { texto: "#5b6a94", fondo: "#eef2fb" },
  "En planificación": { texto: "#334155", fondo: "#f1f5f9" },
  "En contexto": { texto: "#0369a1", fondo: "#e0f2fe" },
  "En desarrollo": { texto: "#92400e", fondo: "#fef3c7" },
  "Lista para TIC": { texto: "#6d28d9", fondo: "#ede9fe" },
  "Entregada a TIC": { texto: "#115e59", fondo: "#ccfbf1" },
  "En producción": { texto: "#047857", fondo: "#d1fae5" },
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

/** Color de cada clase de mantenimiento, para el mismo punto que usa `COLOR_TIPO`. */
export const COLOR_CLASE_MANTENIMIENTO: Record<ClaseMantenimiento, string> = {
  Correctivo: "var(--chart-2)",
  Mejora: "var(--chart-3)",
  Actualización: "var(--chart-4)",
};

/**
 * El semáforo de `CLASES_ESTADO_MANTENIMIENTO`, en colores literales: el
 * reporte impreso no tiene Tailwind. Ver `COLOR_ESTADO_IMPRESION`, su
 * equivalente para el estado del documento.
 */
export const COLOR_ESTADO_MANTENIMIENTO_IMPRESION: Record<
  EstadoMantenimiento,
  { texto: string; fondo: string }
> = {
  Abierto: { texto: "#92400e", fondo: "#fef3c7" },
  "En curso": { texto: "#0369a1", fondo: "#e0f2fe" },
  Cerrado: { texto: "#5b6a94", fondo: "#eef2fb" },
};

/**
 * La barra de avance lleva UN color, no una rampa por fases.
 *
 * Azul (el color de la marca) mientras la cosa se está construyendo, verde
 * cuando ya está terminada. Son los dos únicos estados que alguien necesita
 * distinguir de un vistazo a tres metros; el resto del matiz lo dan el número
 * de abajo y el badge del estado, que están ahí mismo.
 *
 * El porcentaje no se pinta con el color de la barra: el verde legible sobre
 * blanco a 12px obligaría a oscurecerlo tanto que dejaría de ser el mismo
 * verde. El color vive donde hay superficie —la barra— y el texto se queda en
 * el gris de siempre.
 */
export const COLOR_AVANCE = {
  enCurso: "var(--primary)",
  terminado: "var(--chart-3)",
} as const;

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

// -------------------------------------------------- Semáforo de la entrega

export type TonoEntrega =
  | "sin-fecha"
  | "cumplida"
  | "vencida"
  | "hoy"
  | "pronto"
  | "a-tiempo";

export type SemaforoEntrega = {
  tono: TonoEntrega;
  /** Texto corto del plazo: "Vence hoy", "Hace 3 días", "En 12 días". */
  plazo: string;
  /** Clases de badge para la aplicación. */
  clases: string;
  /** Colores literales para el reporte impreso, que no tiene Tailwind. */
  impresion: { texto: string; fondo: string };
};

const TONOS_ENTREGA: Record<
  TonoEntrega,
  { clases: string; impresion: { texto: string; fondo: string } }
> = {
  "sin-fecha": {
    clases: "text-muted-foreground",
    impresion: { texto: "#5b6a94", fondo: "transparent" },
  },
  cumplida: {
    clases:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    impresion: { texto: "#047857", fondo: "#d1fae5" },
  },
  vencida: {
    clases: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    impresion: { texto: "#b91c1c", fondo: "#fee2e2" },
  },
  hoy: {
    clases:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
    impresion: { texto: "#c2410c", fondo: "#ffedd5" },
  },
  pronto: {
    clases:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    impresion: { texto: "#92400e", fondo: "#fef3c7" },
  },
  "a-tiempo": {
    clases: "text-muted-foreground",
    impresion: { texto: "#5b6a94", fondo: "transparent" },
  },
};

/** Días de antelación a partir de los cuales la entrega deja de ser "pronto". */
export const DIAS_ENTREGA_PROXIMA = 7;

/**
 * Lo mínimo para pintar el semáforo de un plazo. Documentos y mantenimientos
 * llegan a la misma forma con los dos ayudantes de abajo, así que hay un solo
 * semáforo en toda la aplicación y no uno por entidad.
 */
export type DatosEntrega = {
  fecha_estimada_entrega: string | null;
  dias_para_entrega: number | null;
  /** Ya está terminado: una fecha pasada deja de ser una alarma. */
  cerrado: boolean;
};

export function entregaDeDocumento(
  documento: Pick<
    Documento,
    "fecha_estimada_entrega" | "dias_para_entrega" | "en_produccion"
  >
): DatosEntrega {
  return {
    fecha_estimada_entrega: documento.fecha_estimada_entrega,
    dias_para_entrega: documento.dias_para_entrega,
    cerrado: documento.en_produccion,
  };
}

export function entregaDeMantenimiento(
  mantenimiento: Pick<
    Mantenimiento,
    "fecha_estimada_entrega" | "dias_para_entrega" | "estado"
  >
): DatosEntrega {
  return {
    fecha_estimada_entrega: mantenimiento.fecha_estimada_entrega,
    dias_para_entrega: mantenimiento.dias_para_entrega,
    cerrado: mantenimiento.estado === "Cerrado",
  };
}

/**
 * Traduce la fecha comprometida a un plazo legible y un color.
 *
 * Lo que ya está terminado nunca se pinta de rojo: una fecha pasada sobre algo
 * entregado es historia, no una alarma. Y el conteo de días lo calcula Postgres
 * (`dias_para_entrega`), no el navegador, para que la aplicación y el reporte
 * impreso no puedan discrepar por la zona horaria del equipo.
 */
export function semaforoEntrega(entrega: DatosEntrega): SemaforoEntrega {
  const dias = entrega.dias_para_entrega;

  let tono: TonoEntrega;
  let plazo: string;

  if (!entrega.fecha_estimada_entrega || dias === null) {
    tono = "sin-fecha";
    plazo = "Sin fecha";
  } else if (entrega.cerrado) {
    tono = "cumplida";
    plazo = "Terminada";
  } else if (dias < 0) {
    tono = "vencida";
    const atraso = Math.abs(dias);
    plazo = `Hace ${atraso} ${atraso === 1 ? "día" : "días"}`;
  } else if (dias === 0) {
    tono = "hoy";
    plazo = "Vence hoy";
  } else {
    tono = dias <= DIAS_ENTREGA_PROXIMA ? "pronto" : "a-tiempo";
    plazo = `En ${dias} ${dias === 1 ? "día" : "días"}`;
  }

  return { tono, plazo, ...TONOS_ENTREGA[tono] };
}
