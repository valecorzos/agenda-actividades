"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  CLASES_ESTADO,
  COLOR_FASE,
  COLOR_TIPO,
  ENFOQUE,
  PESO_ENTREGA_TIC,
  PESO_PRODUCCION,
  RESPONSABLES,
} from "@/lib/documentos";
import type {
  EstadoDocumento,
  Responsable,
  TipoDocumento,
} from "@/lib/documentos";

// ------------------------------------------------------------------ Estado

export function BadgeEstado({
  estado,
  className,
}: {
  estado: EstadoDocumento;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASES_ESTADO[estado],
        className
      )}
    >
      {estado}
    </span>
  );
}

// -------------------------------------------------------------------- Tipo

export function BadgeTipo({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: COLOR_TIPO[tipo] }}
      />
      {tipo}
    </span>
  );
}

// ----------------------------------------------------------------- Enfoque

/**
 * Selector de enfoque. Un solo responsable a la vez; volver a pulsar el que ya
 * está marcado lo deja sin asignar, para que soltar un documento cueste un clic.
 */
export function SelectorEnfoque({
  valor,
  onCambiar,
  disabled,
}: {
  valor: Responsable | null;
  onCambiar: (responsable: Responsable | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {RESPONSABLES.map((persona) => {
        const activo = valor === persona;
        const paleta = ENFOQUE[persona];
        return (
          <button
            key={persona}
            type="button"
            disabled={disabled}
            aria-pressed={activo}
            onClick={() => onCambiar(activo ? null : persona)}
            className={cn(
              "inline-flex items-center gap-2 rounded-4xl border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
              activo
                ? "border-transparent"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
            style={
              activo
                ? { backgroundColor: paleta.suave, color: paleta.texto }
                : undefined
            }
          >
            <span
              aria-hidden
              className={cn(
                "flex size-4 items-center justify-center rounded-full border",
                !activo && "border-border"
              )}
              style={
                activo
                  ? { backgroundColor: paleta.color, borderColor: paleta.color }
                  : undefined
              }
            >
              {activo && (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  strokeWidth={3}
                  className="size-2.5 text-white"
                />
              )}
            </span>
            {persona}
          </button>
        );
      })}
      {valor && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCambiar(null)}
          className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
        >
          Quitar enfoque
        </button>
      )}
    </div>
  );
}

/**
 * Los dos ganchitos, para marcar el enfoque desde la propia tabla sin abrir el
 * formulario. Solo uno puede estar activo; pulsar el activo lo desmarca.
 *
 * Sin iniciales: quien distingue a Juan de Valentina es el color, reforzado por
 * una posición fija (Juan siempre a la izquierda) y por el nombre en el título
 * y la etiqueta accesible, que es lo que leen los lectores de pantalla.
 */
export function GanchitosEnfoque({
  valor,
  onCambiar,
}: {
  valor: Responsable | null;
  onCambiar: (responsable: Responsable | null) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {RESPONSABLES.map((persona) => {
        const activo = valor === persona;
        const paleta = ENFOQUE[persona];
        return (
          <button
            key={persona}
            type="button"
            aria-pressed={activo}
            aria-label={
              activo ? `Quitar enfoque de ${persona}` : `Enfocar a ${persona}`
            }
            title={
              activo ? `${persona} — pulsa para quitar` : `Enfocar a ${persona}`
            }
            onClick={() => onCambiar(activo ? null : persona)}
            className={cn(
              "group flex size-6 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              activo
                ? "border-transparent text-white"
                : "border-dashed border-border hover:border-solid"
            )}
            style={
              activo
                ? { backgroundColor: paleta.color }
                : { color: paleta.color }
            }
          >
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={3}
              className={cn(
                "size-3.5 transition-opacity",
                // Inactivo: el ganchito solo se insinúa al pasar por encima, para
                // que el círculo se vea pulsable sin competir con el que sí está
                // marcado.
                activo
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------- Fases

type ValoresFase = {
  pct_planificacion: number;
  pct_contexto: number;
  pct_desarrollo: number;
  entregado_tic: boolean;
  en_produccion: boolean;
};

/**
 * Barra segmentada del avance. El ancho de cada segmento es su peso dentro de
 * la fórmula (20/20/40/10/10) y el relleno es cuánto de esa fase está hecho: la
 * barra llena equivale exactamente al 100% global, así que el gráfico y el
 * número no pueden contradecirse.
 */
export function BarraFases({
  valores,
  className,
}: {
  valores: ValoresFase;
  className?: string;
}) {
  const segmentos = [
    {
      etiqueta: "Planificación",
      peso: 20,
      pct: valores.pct_planificacion,
      color: COLOR_FASE.planificacion,
    },
    {
      etiqueta: "Contexto",
      peso: 20,
      pct: valores.pct_contexto,
      color: COLOR_FASE.contexto,
    },
    {
      etiqueta: "Desarrollo",
      peso: 40,
      pct: valores.pct_desarrollo,
      color: COLOR_FASE.desarrollo,
    },
    {
      etiqueta: "Entrega a TIC",
      peso: PESO_ENTREGA_TIC * 100,
      pct: valores.entregado_tic ? 100 : 0,
      color: COLOR_FASE.tic,
    },
    {
      etiqueta: "En producción",
      peso: PESO_PRODUCCION * 100,
      pct: valores.en_produccion ? 100 : 0,
      color: COLOR_FASE.produccion,
    },
  ];

  return (
    <div
      className={cn("flex h-2.5 w-full gap-0.5", className)}
      role="img"
      aria-label={segmentos
        .map((s) => `${s.etiqueta} ${s.pct}%`)
        .join(", ")}
    >
      {segmentos.map((s) => (
        <div
          key={s.etiqueta}
          className="h-full overflow-hidden rounded-[3px] bg-muted"
          style={{ flex: `${s.peso} 0 0` }}
          title={`${s.etiqueta}: ${s.pct}%`}
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-300"
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
          />
        </div>
      ))}
    </div>
  );
}

/** Leyenda de la barra de fases. Sin ella el color no significa nada. */
export function LeyendaFases({ className }: { className?: string }) {
  const items = [
    { etiqueta: "Planificación 20%", color: COLOR_FASE.planificacion },
    { etiqueta: "Contexto 20%", color: COLOR_FASE.contexto },
    { etiqueta: "Desarrollo 40%", color: COLOR_FASE.desarrollo },
    { etiqueta: "Entrega a TIC 10%", color: COLOR_FASE.tic },
    { etiqueta: "En producción 10%", color: COLOR_FASE.produccion },
  ];
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      {items.map((i) => (
        <li
          key={i.etiqueta}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: i.color }}
          />
          {i.etiqueta}
        </li>
      ))}
    </ul>
  );
}
