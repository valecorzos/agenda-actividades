"use client";

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import {
  CLASES_ESTADO,
  CLASES_ESTADO_MANTENIMIENTO,
  COLOR_AVANCE,
  COLOR_TIPO,
  ENFOQUE,
  RESPONSABLES,
  formatearFecha,
  semaforoEntrega,
} from "@/lib/documentos";
import type {
  DatosEntrega,
  EstadoDocumento,
  EstadoMantenimiento,
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

/**
 * El estado de un mantenimiento. Es de solo lectura: lo deriva Postgres del
 * progreso y de la fecha de inicio, así que aquí no hay nada que pulsar.
 */
export function BadgeEstadoMantenimiento({
  estado,
  className,
}: {
  estado: EstadoMantenimiento;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASES_ESTADO_MANTENIMIENTO[estado],
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

// ----------------------------------------------------------------- Entrega

/**
 * Fecha comprometida y cuánto falta para ella. El color no repite la fecha: la
 * fecha dice *cuándo* y el plazo dice *qué tan cerca está*, que es lo único que
 * se lee de un vistazo cuando la tabla tiene cuarenta filas.
 *
 * Sin fecha pactada se pinta un guion y nada más: un documento sin compromiso
 * no está atrasado, simplemente no entra en el semáforo.
 */
export function Entrega({ entrega }: { entrega: DatosEntrega }) {
  if (!entrega.fecha_estimada_entrega) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className="flex flex-col items-start gap-1 whitespace-nowrap">
      <span className="text-sm">
        {formatearFecha(entrega.fecha_estimada_entrega)}
      </span>
      <BadgePlazo entrega={entrega} />
    </span>
  );
}

/** Solo el chip del plazo, para donde la fecha ya está a la vista. */
export function BadgePlazo({
  entrega,
  className,
}: {
  entrega: DatosEntrega;
  className?: string;
}) {
  const semaforo = semaforoEntrega(entrega);
  if (semaforo.tono === "sin-fecha") return null;

  return (
    <span
      className={cn(
        "w-fit rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium",
        semaforo.clases,
        className
      )}
    >
      {semaforo.plazo}
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

// ------------------------------------------------------------------ Avance

/**
 * Barra de avance. Una sola barra y un solo color: la rampa por fases decía
 * cinco cosas a la vez y ninguna se leía de un vistazo, que es justo para lo
 * que sirve una barra en una tabla de cuarenta filas.
 *
 * El desglose por fase no se pierde: sigue en el formulario del documento,
 * que es donde se edita, y en la ficha del reporte impreso.
 */
export function BarraAvance({
  valor,
  terminado = valor >= 100,
  className,
}: {
  valor: number;
  /** Pinta la barra de verde. Por defecto, cuando llega al 100%. */
  terminado?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      role="img"
      aria-label={`${valor}% de avance`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${valor}%`,
          backgroundColor: terminado
            ? COLOR_AVANCE.terminado
            : COLOR_AVANCE.enCurso,
        }}
      />
    </div>
  );
}

/**
 * La barra con su porcentaje debajo. `detalle` es para lo que quiera colgarse
 * a la derecha del número —una fecha de hito, por ejemplo— sin que cada sitio
 * tenga que rearmar el maquetado.
 */
export function Avance({
  valor,
  terminado,
  detalle,
  className,
}: {
  valor: number;
  terminado?: boolean;
  detalle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-[7rem] flex-col gap-1.5", className)}>
      <BarraAvance valor={valor} terminado={terminado} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">{valor}%</span>
        {detalle}
      </div>
    </div>
  );
}

/** Qué significan los dos colores de la barra. Sin esto, el verde no dice nada. */
export function LeyendaAvance({ className }: { className?: string }) {
  const items = [
    { etiqueta: "En construcción", color: COLOR_AVANCE.enCurso },
    { etiqueta: "En producción", color: COLOR_AVANCE.terminado },
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
