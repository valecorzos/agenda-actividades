"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, RocketIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Combobox, type OpcionCombobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeEstado, SelectorEnfoque } from "@/components/documentos/piezas";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import {
  COLOR_FASE,
  COLOR_TIPO,
  FASES,
  TIPOS_DOCUMENTO,
  calcularAvanceGlobal,
  derivarEstado,
} from "@/lib/documentos";
import type {
  Documento,
  DocumentoInput,
  Responsable,
  TipoDocumento,
} from "@/lib/documentos";

const ID_FORMULARIO = "formulario-documento";

type EstadoFormulario = {
  lineaNegocioId: string | null;
  procesoId: string | null;
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string;
  planificacion: number;
  contexto: number;
  desarrollo: number;
  entregadoTic: boolean;
  enProduccion: boolean;
  responsable: Responsable | null;
};

const VACIO: EstadoFormulario = {
  lineaNegocioId: null,
  procesoId: null,
  tipo: "App",
  nombre: "",
  descripcion: "",
  planificacion: 0,
  contexto: 0,
  desarrollo: 0,
  entregadoTic: false,
  enProduccion: false,
  responsable: null,
};

function desdeDocumento(d: Documento): EstadoFormulario {
  return {
    lineaNegocioId: d.linea_negocio_id,
    procesoId: d.proceso_id,
    tipo: d.tipo,
    nombre: d.nombre,
    descripcion: d.descripcion ?? "",
    planificacion: d.pct_planificacion,
    contexto: d.pct_contexto,
    desarrollo: d.pct_desarrollo,
    entregadoTic: d.entregado_tic,
    enProduccion: d.en_produccion,
    responsable: d.responsable,
  };
}

export function DocumentoSheet({
  open,
  onOpenChange,
  documento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documento: Documento | null;
}) {
  const { lineas, procesos, guardar, crearLinea, crearProceso } =
    useDocumentos();

  const [form, setForm] = React.useState<EstadoFormulario>(VACIO);
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(documento ? desdeDocumento(documento) : VACIO);
    setError(null);
  }, [open, documento]);

  function cambiar<K extends keyof EstadoFormulario>(
    clave: K,
    valor: EstadoFormulario[K]
  ) {
    setForm((previo) => ({ ...previo, [clave]: valor }));
  }

  const opcionesLinea: OpcionCombobox[] = lineas.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    color: l.color,
  }));

  // Se ofrecen los procesos transversales más los propios de la empresa elegida.
  const opcionesProceso: OpcionCombobox[] = procesos
    .filter(
      (p) =>
        p.linea_negocio_id === null ||
        p.linea_negocio_id === form.lineaNegocioId
    )
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      detalle: p.linea_negocio_id ? "propio" : undefined,
    }));

  const avanceGlobal = calcularAvanceGlobal(
    form.planificacion,
    form.contexto,
    form.desarrollo,
    form.entregadoTic,
    form.enProduccion
  );
  const estado = derivarEstado(
    form.planificacion,
    form.contexto,
    form.desarrollo,
    form.entregadoTic,
    form.enProduccion
  );

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    if (!form.lineaNegocioId) return setError("Elige una línea de negocio.");
    if (!form.procesoId) return setError("Elige un proceso.");
    if (!form.nombre.trim())
      return setError("El nombre del documento no puede estar vacío.");

    const input: DocumentoInput = {
      linea_negocio_id: form.lineaNegocioId,
      proceso_id: form.procesoId,
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      pct_planificacion: form.planificacion,
      pct_contexto: form.contexto,
      pct_desarrollo: form.desarrollo,
      entregado_tic: form.entregadoTic,
      en_produccion: form.enProduccion,
      responsable: form.responsable,
    };

    setGuardando(true);
    setError(null);
    try {
      await guardar(documento?.id ?? null, input);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo guardar: ${e.message}`
          : "No se pudo guardar el documento."
      );
    } finally {
      setGuardando(false);
    }
  }

  const valorFase = {
    planificacion: form.planificacion,
    contexto: form.contexto,
    desarrollo: form.desarrollo,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={documento ? "Editar documento" : "Nuevo documento"}
        description={
          documento
            ? "Los cambios de avance quedan registrados en la bitácora."
            : "Registra el entregable y en qué punto va."
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-fit"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO}
              disabled={guardando}
              className="w-full sm:w-fit"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        }
      >
        <form
          id={ID_FORMULARIO}
          onSubmit={enviar}
          className="flex flex-col gap-6"
        >
          {/* ------------------------------------------------ Clasificación */}
          <section className="flex flex-col gap-4">
            <Campo
              etiqueta="Línea de negocio"
              ayuda="Para qué empresa del grupo es. Escribe una nueva para crearla."
            >
              <Combobox
                opciones={opcionesLinea}
                valorId={form.lineaNegocioId}
                onSeleccionar={(id) => {
                  cambiar("lineaNegocioId", id);
                  // Si el proceso elegido pertenecía a otra empresa, deja de ser válido.
                  const proceso = procesos.find((p) => p.id === form.procesoId);
                  if (proceso?.linea_negocio_id && proceso.linea_negocio_id !== id) {
                    cambiar("procesoId", null);
                  }
                }}
                onCrear={crearLinea}
                placeholder="Buscar o crear empresa…"
                textoVacio="Escribe el nombre para crearla."
              />
            </Campo>

            <Campo
              etiqueta="Proceso"
              ayuda="Departamento o proceso al que sirve el documento."
            >
              <Combobox
                opciones={opcionesProceso}
                valorId={form.procesoId}
                onSeleccionar={(id) => cambiar("procesoId", id)}
                onCrear={crearProceso}
                placeholder="Buscar o crear proceso…"
                textoVacio="Escribe el nombre para crearlo."
              />
            </Campo>

            <Campo etiqueta="Tipo">
              <Select
                value={form.tipo}
                onValueChange={(v) => cambiar("tipo", v as TipoDocumento)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ backgroundColor: COLOR_TIPO[t] }}
                        />
                        {t}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo etiqueta="Nombre del documento">
              <Input
                value={form.nombre}
                onChange={(e) => cambiar("nombre", e.target.value)}
                placeholder="Ej. Formulario de ingreso de personal"
              />
            </Campo>

            <Campo etiqueta="Descripción" opcional>
              <Textarea
                value={form.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
                placeholder="Alcance, notas o pendientes."
                rows={3}
              />
            </Campo>
          </section>

          <hr className="border-border" />

          {/* ------------------------------------------------------ Enfoque */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Enfoque</h3>
              <p className="text-xs text-muted-foreground">
                Quién está trabajando este documento ahora mismo.
              </p>
            </div>
            <SelectorEnfoque
              valor={form.responsable}
              onCambiar={(r) => cambiar("responsable", r)}
            />
          </section>

          <hr className="border-border" />

          {/* ------------------------------------------------------- Avance */}
          <section className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">Estatus</h3>
                <p className="text-xs text-muted-foreground">
                  El porcentaje global se calcula solo.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-2xl leading-none font-semibold text-primary">
                  {avanceGlobal}%
                </span>
                <BadgeEstado estado={estado} />
              </div>
            </div>

            {FASES.map((fase) => (
              <div key={fase.clave} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-sm font-medium">
                    {fase.etiqueta}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      pesa {Math.round(fase.peso * 100)}%
                    </span>
                  </label>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {valorFase[fase.clave]}%
                  </span>
                </div>
                <Slider
                  value={valorFase[fase.clave]}
                  onValueChange={(v) =>
                    cambiar(fase.clave, Array.isArray(v) ? v[0] : v)
                  }
                  step={5}
                  color={COLOR_FASE[fase.clave]}
                  aria-label={fase.etiqueta}
                />
                <p className="text-xs text-muted-foreground">{fase.ayuda}</p>
              </div>
            ))}

            <label className="flex items-start justify-between gap-4 rounded-2xl bg-muted/60 p-3">
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <HugeiconsIcon
                    icon={SentIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  Entregada a TIC
                </span>
                <span className="text-xs text-muted-foreground">
                  Vale 10%. La fecha de entrega se registra sola.
                </span>
              </span>
              <Switch
                checked={form.entregadoTic}
                onCheckedChange={(v) => {
                  cambiar("entregadoTic", v);
                  // Nada puede estar en producción sin haberse entregado.
                  if (!v) cambiar("enProduccion", false);
                }}
              />
            </label>

            <label
              className={cn(
                "flex items-start justify-between gap-4 rounded-2xl bg-muted/60 p-3 transition-opacity",
                !form.entregadoTic && "opacity-60"
              )}
            >
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <HugeiconsIcon
                    icon={RocketIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  En producción
                </span>
                <span className="text-xs text-muted-foreground">
                  {form.entregadoTic
                    ? "Vale el 10% final: ya la está usando el negocio."
                    : "Primero hay que entregarla a TIC."}
                </span>
              </span>
              <Switch
                checked={form.enProduccion}
                disabled={!form.entregadoTic}
                onCheckedChange={(v) => cambiar("enProduccion", v)}
              />
            </label>
          </section>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Campo({
  etiqueta,
  ayuda,
  opcional,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">
        {etiqueta}
        {opcional && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            opcional
          </span>
        )}
      </label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}
