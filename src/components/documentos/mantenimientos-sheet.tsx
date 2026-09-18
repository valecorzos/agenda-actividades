"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BadgeEstadoMantenimiento,
  BadgePlazo,
  SelectorEnfoque,
} from "@/components/documentos/piezas";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import {
  fetchMantenimientos,
  createMantenimiento,
  updateMantenimiento,
  deleteMantenimiento,
} from "@/lib/supabase/mantenimientos";
import { startOfToday, toDateKey } from "@/lib/date";
import {
  AYUDA_CLASE,
  CLASES_MANTENIMIENTO,
  COLOR_AVANCE,
  derivarEstadoMantenimiento,
  entregaDeMantenimiento,
  formatearFecha,
} from "@/lib/documentos";
import type {
  ClaseMantenimiento,
  Documento,
  Mantenimiento,
  MantenimientoInput,
  Responsable,
} from "@/lib/documentos";

const ID_FORMULARIO = "formulario-mantenimiento";

/** Lo que se puede cambiar de un mantenimiento ya creado, desde su tarjeta. */
type CambioMantenimiento = Partial<Omit<MantenimientoInput, "documento_id">>;

/**
 * Aplica un cambio sobre la copia local y recalcula el estado con el mismo
 * criterio que la base, para que el badge no espere a la recarga.
 */
function conCambios(
  mantenimiento: Mantenimiento,
  cambios: CambioMantenimiento
): Mantenimiento {
  const fusionado = { ...mantenimiento, ...cambios };
  return {
    ...fusionado,
    estado: derivarEstadoMantenimiento(
      fusionado.progreso,
      fusionado.fecha_inicio
    ),
  };
}

function aNumero(valor: number | readonly number[]): number {
  return Array.isArray(valor) ? valor[0] : (valor as number);
}

/**
 * Bitácora de mantenimientos de un documento. Vive en su propio panel y no
 * dentro del formulario del documento: son dos trabajos distintos y mezclarlos
 * haría del formulario una pantalla interminable.
 *
 * Cada tarjeta se edita en vivo: mover el progreso o cambiar una fecha guarda
 * solo, igual que los ganchitos de enfoque de la tabla. No hay botón de guardar
 * por mantenimiento porque no hay formulario que enviar —son campos sueltos.
 */
export function MantenimientosSheet({
  open,
  onOpenChange,
  documento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documento: Documento | null;
}) {
  const { recargar } = useDocumentos();

  const [items, setItems] = React.useState<Mantenimiento[]>([]);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  const [titulo, setTitulo] = React.useState("");
  const [descripcion, setDescripcion] = React.useState("");
  const [clase, setClase] = React.useState<ClaseMantenimiento>("Mejora");
  const [responsable, setResponsable] = React.useState<Responsable | null>(null);
  const [fechaSolicitud, setFechaSolicitud] = React.useState("");
  const [fechaInicio, setFechaInicio] = React.useState("");
  const [fechaEstimada, setFechaEstimada] = React.useState("");

  const documentoId = documento?.id ?? null;

  const traer = React.useCallback(async () => {
    if (!documentoId) return [];
    return fetchMantenimientos(documentoId);
  }, [documentoId]);

  const cargar = React.useCallback(async () => {
    if (!documentoId) return;
    setCargando(true);
    setError(null);
    try {
      setItems(await traer());
    } catch {
      setError("No se pudieron cargar los mantenimientos.");
    } finally {
      setCargando(false);
    }
  }, [documentoId, traer]);

  /**
   * Recarga sin el cartel de "Cargando…". Después de tocar un slider, ver la
   * lista parpadear en blanco sería peor que esperar callado a que lleguen los
   * días en curso recalculados.
   */
  const recargarSilencioso = React.useCallback(async () => {
    try {
      setItems(await traer());
    } catch {
      /* Se queda la copia optimista; el próximo guardado lo reintenta. */
    }
  }, [traer]);

  React.useEffect(() => {
    if (!open) return;
    setTitulo("");
    setDescripcion("");
    setClase("Mejora");
    setResponsable(null);
    setFechaSolicitud(toDateKey(startOfToday()));
    setFechaInicio("");
    setFechaEstimada("");
    cargar();
  }, [open, cargar]);

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!documentoId) return;
    if (!titulo.trim()) {
      setError("Escribe qué se pidió.");
      return;
    }
    if (!fechaSolicitud) {
      setError("Pon la fecha en que lo pidieron.");
      return;
    }
    if (fechaEstimada && fechaInicio && fechaEstimada < fechaInicio) {
      setError("La fecha de entrega no puede ser anterior a la de inicio.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await createMantenimiento({
        documento_id: documentoId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        clase,
        responsable,
        // Nace sin avance: si ya se empezó, la fecha de inicio es la que lo
        // pone "En curso", y el porcentaje se mueve después desde la tarjeta.
        progreso: 0,
        fecha_solicitud: fechaSolicitud,
        fecha_inicio: fechaInicio || null,
        fecha_estimada_entrega: fechaEstimada || null,
      });
      setTitulo("");
      setDescripcion("");
      setFechaInicio("");
      setFechaEstimada("");
      await cargar();
      // Refresca los contadores de la tabla principal.
      await recargar();
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo guardar: ${e.message}`
          : "No se pudo guardar el mantenimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  /** Cambio en la tarjeta, sin tocar la base todavía. */
  function editarLocal(item: Mantenimiento, cambios: CambioMantenimiento) {
    setItems((actuales) =>
      actuales.map((m) => (m.id === item.id ? conCambios(m, cambios) : m))
    );
  }

  /**
   * Manda a la base lo que ya está en la tarjeta. Si falla no se intenta
   * revertir a mano: se vuelve a leer de la base, que es la única copia en la
   * que se puede confiar después de un error.
   */
  async function guardar(item: Mantenimiento, cambios: CambioMantenimiento) {
    setError(null);
    try {
      await updateMantenimiento(item.id, cambios);
      await recargarSilencioso();
      await recargar();
    } catch {
      setError("No se pudo guardar el cambio.");
      await cargar();
    }
  }

  async function eliminar(item: Mantenimiento) {
    const previos = items;
    setItems((actuales) => actuales.filter((m) => m.id !== item.id));
    try {
      await deleteMantenimiento(item.id);
      await recargar();
    } catch {
      setItems(previos);
      setError("No se pudo eliminar el mantenimiento.");
    }
  }

  const abiertos = items.filter((m) => m.estado !== "Cerrado").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Mantenimientos"
        description={documento?.nombre}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              {items.length === 0
                ? "Sin mantenimientos registrados."
                : `${items.length} en total · ${abiertos} sin cerrar`}
            </span>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              disabled={guardando}
              className="w-full sm:w-fit"
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              {guardando ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* ------------------------------------------------ Alta rápida */}
          <form
            id={ID_FORMULARIO}
            onSubmit={agregar}
            className="flex flex-col gap-4 rounded-2xl bg-muted/50 p-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Qué se pidió</label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Agregar filtro por sucursal"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Clase</label>
              <Select
                value={clase}
                onValueChange={(v) => setClase(v as ClaseMantenimiento)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASES_MANTENIMIENTO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {AYUDA_CLASE[clase]}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Detalle
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  opcional
                </span>
              </label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                placeholder="Contexto, quién lo pidió, condiciones."
              />
            </div>

            {/* Tres fechas distintas y a propósito: cuándo lo pidieron, cuándo
                nos pusimos con ello y para cuándo quedamos. */}
            <div className="grid gap-3 sm:grid-cols-3">
              <CampoFecha
                etiqueta="Lo pidieron"
                value={fechaSolicitud}
                onChange={setFechaSolicitud}
              />
              <CampoFecha
                etiqueta="Empezamos"
                opcional
                value={fechaInicio}
                onChange={setFechaInicio}
              />
              <CampoFecha
                etiqueta="Entrega estimada"
                opcional
                min={fechaInicio || undefined}
                value={fechaEstimada}
                onChange={setFechaEstimada}
              />
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">
              Déjalo sin fecha de inicio si todavía no te has puesto: queda como
              Abierto hasta que la pongas.
            </p>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Enfoque</span>
              <SelectorEnfoque valor={responsable} onCambiar={setResponsable} />
            </div>
          </form>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* --------------------------------------------------- Historial */}
          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Todavía no hay mantenimientos para este documento.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl border border-border p-3 transition-opacity",
                    m.estado === "Cerrado" && "opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{m.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.clase} · pedido el{" "}
                        {formatearFecha(m.fecha_solicitud)}
                        {m.responsable && ` · ${m.responsable}`}
                        {m.dias_en_curso !== null &&
                          ` · ${m.dias_en_curso} ${
                            m.dias_en_curso === 1 ? "día" : "días"
                          } en curso`}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <BadgeEstadoMantenimiento estado={m.estado} />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => eliminar(m)}
                        aria-label={`Eliminar ${m.titulo}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                      </Button>
                    </div>
                  </div>

                  {m.descripcion && (
                    <p className="text-xs text-muted-foreground">
                      {m.descripcion}
                    </p>
                  )}

                  {/* El propio slider es la barra de avance: un solo color,
                      verde cuando ya está cerrado, y el porcentaje debajo.
                      Arrastrar solo mueve la copia local; se guarda al soltar,
                      para no escribir en la base en cada píxel. */}
                  <div className="flex flex-col gap-0.5">
                    <Slider
                      value={m.progreso}
                      step={5}
                      color={
                        m.estado === "Cerrado"
                          ? COLOR_AVANCE.terminado
                          : COLOR_AVANCE.enCurso
                      }
                      onValueChange={(v) =>
                        editarLocal(m, { progreso: aNumero(v) })
                      }
                      onValueCommitted={(v) =>
                        guardar(m, { progreso: aNumero(v) })
                      }
                      aria-label={`Avance de ${m.titulo}`}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {m.progreso}%
                      </span>
                      {m.fecha_cierre && (
                        <span className="text-[11px] text-muted-foreground">
                          cerrado el {formatearFecha(m.fecha_cierre)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <CampoFecha
                      etiqueta="Empezamos"
                      compacto
                      value={m.fecha_inicio ?? ""}
                      onChange={(v) =>
                        editarLocal(m, { fecha_inicio: v || null })
                      }
                      onCommit={() =>
                        guardar(m, { fecha_inicio: m.fecha_inicio })
                      }
                    />
                    <CampoFecha
                      etiqueta="Entrega estimada"
                      compacto
                      min={m.fecha_inicio ?? undefined}
                      value={m.fecha_estimada_entrega ?? ""}
                      onChange={(v) =>
                        editarLocal(m, { fecha_estimada_entrega: v || null })
                      }
                      onCommit={() =>
                        guardar(m, {
                          fecha_estimada_entrega: m.fecha_estimada_entrega,
                        })
                      }
                      extra={<BadgePlazo entrega={entregaDeMantenimiento(m)} />}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Campo de fecha con su etiqueta. `onCommit` existe porque los navegadores
 * emiten cambios intermedios mientras se teclea el año —0002, 0020, 0202…— y
 * mandarlos a la base sería escribir basura: se guarda al salir del campo.
 */
function CampoFecha({
  etiqueta,
  value,
  onChange,
  onCommit,
  min,
  opcional,
  compacto,
  extra,
}: {
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  onCommit?: () => void;
  min?: string;
  opcional?: boolean;
  compacto?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {etiqueta}
        {opcional && <span className="opacity-70">(opcional)</span>}
        {extra}
      </span>
      <Input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        className={cn(compacto && "h-8 text-xs md:text-xs")}
      />
    </label>
  );
}
