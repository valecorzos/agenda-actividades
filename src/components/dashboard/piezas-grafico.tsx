"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
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
  Segmento,
} from "@/lib/dashboard/modelo";

// ------------------------------------------------------------- Contenedores

export function TarjetaGrafico({
  titulo,
  descripcion,
  leyenda,
  children,
  className,
}: {
  titulo: string;
  descripcion?: string;
  leyenda?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl bg-card p-6 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-sm font-medium">{titulo}</h3>
        {descripcion && (
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {children}
      {leyenda}
    </section>
  );
}

export function Leyenda({
  items,
  className,
}: {
  items: { etiqueta: string; color: string }[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-1",
        className
      )}
    >
      {items.map((i) => (
        <li
          key={i.etiqueta}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: i.color }}
          />
          {i.etiqueta}
        </li>
      ))}
    </ul>
  );
}

export function SinDatos({ mensaje = "Sin datos para este recorte." }) {
  return (
    <p className="py-8 text-center text-xs text-muted-foreground">{mensaje}</p>
  );
}

// ------------------------------------------------------------------- Anillo

/**
 * Anillo de estatus. Tres tramos con su cifra escrita encima del arco: el
 * número se lee sin pasar por la leyenda, que queda solo para nombrar los
 * colores. Un anillo sirve para ver la parte respecto al todo de un vistazo,
 * y con tres porciones eso funciona.
 */
export function GraficoAnillo({
  segmentos,
  total,
}: {
  segmentos: Segmento[];
  total: number;
}) {
  const visibles = segmentos.filter((s) => s.cantidad > 0);
  if (visibles.length === 0) return <SinDatos />;

  const trazos = trazosAnillo(visibles.map((s) => s.cantidad));
  const centro = ANILLO.lado / 2;

  return (
    <svg
      viewBox={`0 0 ${ANILLO.lado} ${ANILLO.lado}`}
      className="mx-auto w-full max-w-[380px]"
      role="img"
      aria-label={visibles
        .map((s) => `${s.etiqueta}: ${s.cantidad}, ${s.pct}%`)
        .join(". ")}
    >
      <g transform={`rotate(-90 ${centro} ${centro})`}>
        {visibles.map((s, i) => (
          <circle
            key={s.clave}
            cx={centro}
            cy={centro}
            r={ANILLO.radio}
            fill="none"
            stroke={s.color}
            strokeWidth={ANILLO.grosor}
            strokeDasharray={trazos[i].dash}
            strokeDashoffset={trazos[i].offset}
          >
            <title>{`${s.etiqueta}: ${s.cantidad} · ${s.pct}%`}</title>
          </circle>
        ))}
      </g>

      {/* La cifra va sobre su arco, en blanco o en tinta según lo oscuro que
          sea el tramo, para que siempre se lea. */}
      {visibles.map((s, i) =>
        trazos[i].cabeEtiqueta ? (
          <text
            key={`e-${s.clave}`}
            x={trazos[i].etiqueta.x}
            y={trazos[i].etiqueta.y + 3.5}
            textAnchor="middle"
            fill={s.colorTexto}
            style={{
              fontSize: TIPOGRAFIA_ANILLO.cifraSegmento,
              fontWeight: 600,
            }}
          >
            {s.cantidad}
          </text>
        ) : null
      )}

      {/* La cifra guía del tablero. Sin `tabular-nums`: a este tamaño los
          dígitos de ancho fijo se ven sueltos. */}
      <text
        x={centro}
        y={centro + 4}
        textAnchor="middle"
        className="fill-foreground"
        style={{ fontSize: TIPOGRAFIA_ANILLO.cifraCentral, fontWeight: 600 }}
      >
        {total}
      </text>
      <text
        x={centro}
        y={centro + 19}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: TIPOGRAFIA_ANILLO.etiquetaCentral }}
      >
        {total === 1 ? "proyecto" : "proyectos"}
      </text>
    </svg>
  );
}

// ----------------------------------------------------------------- Columnas

/**
 * Columnas verticales con el valor sobre la tapa y el nombre debajo.
 *
 * Un solo tono para todas: los tipos no son series distintas, son categorías
 * de una misma cuenta, y el color no tiene nada que añadir a lo que ya dicen
 * la altura y la etiqueta.
 */
export function GraficoColumnas({ items }: { items: Columna[] }) {
  if (items.length === 0) return <SinDatos />;

  const tope = Math.max(...items.map((i) => i.valor), 1);
  // El alto de la tapa se reserva aparte: si la columna más alta ocupara el
  // 100% del área, su etiqueta se saldría de la tarjeta.
  const altoUtil = ALTO_COLUMNAS - 24;

  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-3" style={{ height: ALTO_COLUMNAS }}>
        {items.map((i) => (
          <div
            key={i.clave}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
            title={`${i.etiqueta}: ${i.valor} · ${i.pct}%`}
          >
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {i.valor}
            </span>
            <div
              className="w-full rounded-t-[4px] bg-chart-1 transition-[height] duration-300"
              style={{
                height: Math.max((i.valor / tope) * altoUtil, 3),
                maxWidth: GROSOR_COLUMNA,
              }}
            />
          </div>
        ))}
      </div>
      <div className="h-px w-full bg-grafico-eje" />
      <div className="flex gap-3 pt-2">
        {items.map((i) => (
          <span
            key={i.clave}
            className="flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {i.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------- Barras de avance

/**
 * Avance promedio por grupo, de mayor a menor. La escala llega siempre al
 * 100% —no al mayor de la serie— porque el tope es fijo y conocido: una barra
 * a media tarjeta tiene que significar la mitad del trabajo hecho, no "la
 * mitad del que más lleva".
 *
 * Una sola medida, así que un solo tono: no son identidades distintas.
 */
export function BarrasProgreso({ items }: { items: BarraProgreso[] }) {
  if (items.length === 0) return <SinDatos />;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => {
        const dentro = i.avance >= MINIMO_ETIQUETA_DENTRO;
        return (
          <li key={i.clave} className="flex items-center gap-3">
            {/* Tope en píxeles además del porcentaje: en una tarjeta a todo lo
                ancho, un 38% de columna de nombres deja las barras cortas y
                despegadas de su etiqueta. */}
            <span
              className="w-[38%] max-w-[200px] shrink-0 truncate text-right text-xs text-foreground"
              title={i.etiqueta}
            >
              {i.etiqueta}
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="h-7 min-w-[3px] rounded-[4px] bg-chart-1 transition-[width] duration-300"
                style={{ width: `${Math.max(i.avance, 1)}%` }}
                title={`${i.etiqueta}: ${i.avance}% · ${i.total} ${
                  i.total === 1 ? "documento" : "documentos"
                }`}
              >
                {/* La cifra solo entra en la barra cuando cabe con holgura;
                    si no, se escribe fuera en vez de recortarla. */}
                {dentro && (
                  <span className="flex h-full items-center justify-end pr-2 text-xs font-semibold tabular-nums text-white">
                    {i.avance}%
                  </span>
                )}
              </div>
              {!dentro && (
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {i.avance}%
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
