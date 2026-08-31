"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectorEnfoque } from "@/components/documentos/piezas";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import {
  fetchMantenimientos,
  createMantenimiento,
  updateMantenimiento,
  deleteMantenimiento,
} from "@/lib/supabase/mantenimientos";
import {
  AYUDA_CLASE,
  CLASES_ESTADO_MANTENIMIENTO,
  CLASES_MANTENIMIENTO,
  ESTADOS_MANTENIMIENTO,
  formatearFecha,
} from "@/lib/documentos";
import type {
  ClaseMantenimiento,
  Documento,
  EstadoMantenimiento,
  Mantenimiento,
  Responsable,
} from "@/lib/documentos";

const ID_FORMULARIO = "formulario-mantenimiento";

/**
 * Bitácora de mantenimientos de un documento. Vive en su propio panel y no
 * dentro del formulario del documento: son dos trabajos distintos y mezclarlos
 * haría del formulario una pantalla interminable.
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

  const documentoId = documento?.id ?? null;

  const cargar = React.useCallback(async () => {
    if (!documentoId) return;
    setCargando(true);
    setError(null);
    try {
      setItems(await fetchMantenimientos(documentoId));
    } catch {
      setError("No se pudieron cargar los mantenimientos.");
    } finally {
      setCargando(false);
    }
  }, [documentoId]);

  React.useEffect(() => {
    if (!open) return;
    setTitulo("");
    setDescripcion("");
    setClase("Mejora");
    setResponsable(null);
    cargar();
  }, [open, cargar]);

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!documentoId) return;
    if (!titulo.trim()) {
      setError("Escribe qué se pidió.");
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
        estado: "Abierto",
        responsable,
      });
      setTitulo("");
      setDescripcion("");
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

  async function cambiarEstado(
    item: Mantenimiento,
    estado: EstadoMantenimiento
  ) {
    const previos = items;
    setItems((actuales) =>
      actuales.map((m) => (m.id === item.id ? { ...m, estado } : m))
    );
    try {
      await updateMantenimiento(item.id, { estado });
      await recargar();
    } catch {
      setItems(previos);
      setError("No se pudo cambiar el estado.");
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
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
                    "flex flex-col gap-2 rounded-2xl border border-border p-3 transition-opacity",
                    m.estado === "Cerrado" && "opacity-65"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium">{m.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.clase} · pedido el{" "}
                        {formatearFecha(m.fecha_solicitud)}
                        {m.fecha_cierre &&
                          ` · cerrado el ${formatearFecha(m.fecha_cierre)}`}
                        {m.responsable && ` · ${m.responsable}`}
                      </span>
                    </div>
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

                  {m.descripcion && (
                    <p className="text-xs text-muted-foreground">
                      {m.descripcion}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {ESTADOS_MANTENIMIENTO.map((estado) => (
                      <button
                        key={estado}
                        type="button"
                        aria-pressed={m.estado === estado}
                        onClick={() => cambiarEstado(m, estado)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          m.estado === estado
                            ? CLASES_ESTADO_MANTENIMIENTO[estado]
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {estado}
                      </button>
                    ))}
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
