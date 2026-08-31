"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDocumentos,
  type FiltroResponsable,
} from "@/components/documentos/documentos-provider";
import {
  COLOR_TIPO,
  ENFOQUE,
  ESTADOS_DOCUMENTO,
  RESPONSABLES,
  TIPOS_DOCUMENTO,
} from "@/lib/documentos";
import type { EstadoDocumento, TipoDocumento } from "@/lib/documentos";

/** Sentinela para la opción "todas": Base UI Select no admite `null` como valor. */
const TODAS = "__todas__";

/**
 * Una sola fila de filtros, compartida por la tabla y el dashboard: filtrar en
 * una vista y cambiar a la otra conserva el recorte.
 */
export function DocumentosFiltros() {
  const { filtros, setFiltro, limpiarFiltros, hayFiltros, lineas, procesos } =
    useDocumentos();

  const procesosDisponibles = procesos.filter(
    (p) =>
      !filtros.lineaNegocioId ||
      p.linea_negocio_id === null ||
      p.linea_negocio_id === filtros.lineaNegocioId
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Búsqueda y desplegables en una sola línea, con la búsqueda primero y
          algo más ancha que los demás: es la que recibe texto libre, así que
          es la única que necesita ver lo que se escribió. Los cinco
          desplegables solo muestran una palabra y se reparten el resto.
          En pantallas chicas la rejilla se parte sola en dos o tres columnas,
          que es lo único que evita que los controles se aplasten. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[1.6fr_repeat(5,1fr)]">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filtros.busqueda}
            onChange={(e) => setFiltro("busqueda", e.target.value)}
            placeholder="Buscar…"
            className="h-8 pl-8 pr-2.5 text-xs md:text-xs"
            aria-label="Buscar documento, empresa o proceso"
            title="Buscar documento, empresa o proceso"
          />
        </div>

        <SelectFiltro
          etiqueta="Empresa"
          valor={filtros.lineaNegocioId}
          onCambiar={(v) => setFiltro("lineaNegocioId", v)}
          opciones={lineas.map((l) => ({
            valor: l.id,
            texto: l.nombre,
            color: l.color,
          }))}
        />

        <SelectFiltro
          etiqueta="Proceso"
          valor={filtros.procesoId}
          onCambiar={(v) => setFiltro("procesoId", v)}
          opciones={procesosDisponibles.map((p) => ({
            valor: p.id,
            texto: p.nombre,
          }))}
        />

        <SelectFiltro
          etiqueta="Tipo"
          valor={filtros.tipo}
          onCambiar={(v) => setFiltro("tipo", v as TipoDocumento | null)}
          opciones={TIPOS_DOCUMENTO.map((t) => ({
            valor: t,
            texto: t,
            color: COLOR_TIPO[t],
          }))}
        />

        <SelectFiltro
          etiqueta="Estado"
          valor={filtros.estado}
          onCambiar={(v) => setFiltro("estado", v as EstadoDocumento | null)}
          opciones={ESTADOS_DOCUMENTO.map((e) => ({ valor: e, texto: e }))}
        />

        <SelectFiltro
          etiqueta="Enfoque"
          valor={filtros.responsable}
          onCambiar={(v) =>
            setFiltro("responsable", v as FiltroResponsable | null)
          }
          opciones={[
            ...RESPONSABLES.map((r) => ({
              valor: r,
              texto: r,
              color: ENFOQUE[r].color,
            })),
            { valor: "sin-asignar", texto: "Sin asignar" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={filtros.soloEnCurso}
            onCheckedChange={(v) => setFiltro("soloEnCurso", v)}
          />
          Ocultar lo que ya está en producción
        </label>

        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={limpiarFiltros}
            className="text-muted-foreground"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  );
}

function SelectFiltro({
  etiqueta,
  valor,
  onCambiar,
  opciones,
}: {
  etiqueta: string;
  valor: string | null;
  onCambiar: (valor: string | null) => void;
  opciones: { valor: string; texto: string; color?: string }[];
}) {
  const seleccionada = opciones.find((o) => o.valor === valor);

  return (
    <Select
      value={valor ?? TODAS}
      onValueChange={(v) => onCambiar(v === TODAS ? null : (v as string))}
    >
      <SelectTrigger
        size="sm"
        aria-label={etiqueta}
        title={seleccionada ? `${etiqueta}: ${seleccionada.texto}` : etiqueta}
        // `w-full` pisa el `w-fit` del componente base: en la rejilla cada
        // filtro ocupa su columna entera y nunca se desborda sobre el vecino.
        // El texto y el relleno bajan un paso para que los seis controles
        // quepan en una sola línea sin apretarse.
        className={cn(
          "w-full min-w-0 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
          valor && "border-primary/50 bg-accent"
        )}
      >
        <SelectValue className="min-w-0 truncate">
          {(v: string) =>
            v === TODAS
              ? etiqueta
              : opciones.find((o) => o.valor === v)?.texto ?? etiqueta
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        // Por defecto el popup se coloca ENCIMA del disparador, alineando el
        // elemento activo sobre él: con seis filtros seguidos eso tapa los de
        // al lado. Así cuelga por debajo, anclado a su columna.
        alignItemWithTrigger={false}
        align="start"
        sideOffset={6}
        // El ancho del disparador es solo el mínimo: las opciones largas
        // ("En planificación") necesitan más sitio del que ocupa "Estado".
        className="w-auto min-w-(--anchor-width) max-w-[min(20rem,var(--available-width))]"
      >
        <SelectItem value={TODAS}>Todos · {etiqueta}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            <span className="flex items-center gap-2">
              {o.color && (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: o.color }}
                />
              )}
              {o.texto}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
