"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PencilEdit02Icon,
  Delete02Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Alert02Icon,
  Wrench01Icon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Avance,
  BadgeEstado,
  BadgeTipo,
  Entrega,
  GanchitosEnfoque,
} from "@/components/documentos/piezas";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import {
  DIAS_PARA_ESTANCADO,
  entregaDeDocumento,
  formatearFecha,
} from "@/lib/documentos";
import {
  abrirVentanaReporte,
  imprimirReporteDocumentos,
} from "@/lib/reportes/documentos-pdf";
import { fetchMantenimientosAbiertosPorDocumentos } from "@/lib/supabase/mantenimientos";
import type { Documento } from "@/lib/documentos";

type ClaveOrden =
  | "nombre"
  | "linea_negocio"
  | "avance_global"
  | "dias_sin_movimiento"
  | "dias_para_entrega";

const COLUMNAS: {
  clave: ClaveOrden | null;
  titulo: string;
  className?: string;
}[] = [
  { clave: "nombre", titulo: "Documento" },
  { clave: "linea_negocio", titulo: "Línea de negocio", className: "hidden lg:table-cell" },
  { clave: null, titulo: "Proceso", className: "hidden xl:table-cell" },
  { clave: null, titulo: "Tipo", className: "hidden md:table-cell" },
  { clave: "avance_global", titulo: "Avance" },
  { clave: null, titulo: "Estado", className: "hidden sm:table-cell" },
  {
    clave: "dias_para_entrega",
    titulo: "Entrega estimada",
    className: "hidden md:table-cell",
  },
  { clave: null, titulo: "Enfoque" },
  { clave: null, titulo: "" },
];

export function DocumentosTabla({
  onEditar,
  onMantenimientos,
}: {
  onEditar: (documento: Documento) => void;
  onMantenimientos: (documento: Documento) => void;
}) {
  const { visibles, documentos, cargando, hayFiltros, eliminar, cambiarResponsable } =
    useDocumentos();

  const [orden, setOrden] = React.useState<ClaveOrden>("avance_global");
  const [ascendente, setAscendente] = React.useState(false);
  const [porEliminar, setPorEliminar] = React.useState<Documento | null>(null);
  const [marcados, setMarcados] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = React.useState(false);

  const ordenados = React.useMemo(() => {
    const copia = [...visibles];
    copia.sort((a, b) => {
      const va = a[orden];
      const vb = b[orden];
      // Lo que no tiene valor —una entrega sin fecha pactada— va siempre al
      // final, se ordene como se ordene: no es lo más urgente ni lo menos.
      if (va === null) return vb === null ? 0 : 1;
      if (vb === null) return -1;
      const comparacion =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es");
      return ascendente ? comparacion : -comparacion;
    });
    return copia;
  }, [visibles, orden, ascendente]);

  // La selección se cruza siempre con lo que está a la vista: filtrar deja
  // fuera del PDF lo que se había marcado y ya no se ve, en vez de imprimir a
  // escondidas filas que la jefa no tiene delante.
  const seleccionados = React.useMemo(
    () => ordenados.filter((d) => marcados.has(d.id)),
    [ordenados, marcados]
  );

  const todosMarcados =
    ordenados.length > 0 && seleccionados.length === ordenados.length;

  function alternarOrden(clave: ClaveOrden) {
    if (orden === clave) setAscendente((v) => !v);
    else {
      setOrden(clave);
      // Por nombre y empresa se lee de la A a la Z; por fecha de entrega, lo
      // más urgente primero. Avance y días sin movimiento arrancan al revés.
      setAscendente(
        clave === "nombre" ||
          clave === "linea_negocio" ||
          clave === "dias_para_entrega"
      );
    }
  }

  function alternarMarca(id: string) {
    setMarcados((previos) => {
      const siguientes = new Set(previos);
      if (!siguientes.delete(id)) siguientes.add(id);
      return siguientes;
    });
  }

  function alternarTodos(marcar: boolean) {
    setMarcados((previos) => {
      const siguientes = new Set(previos);
      for (const d of ordenados) {
        if (marcar) siguientes.add(d.id);
        else siguientes.delete(d.id);
      }
      return siguientes;
    });
  }

  async function imprimir() {
    // La ventana se abre aquí, en el mismo evento de clic, y no después del
    // `await` de abajo: pasado ese punto el navegador ya no lo ve como
    // reacción directa al usuario y el bloqueador de pop-ups la para siempre.
    const ventana = abrirVentanaReporte();
    setImprimiendo(true);
    try {
      const mantenimientosPorDocumento =
        await fetchMantenimientosAbiertosPorDocumentos(
          seleccionados.map((d) => d.id)
        );
      const resultado = imprimirReporteDocumentos(
        seleccionados,
        mantenimientosPorDocumento,
        ventana
      );
      setAviso(
        resultado === "descargado"
          ? "El navegador bloqueó la ventana emergente, así que el reporte se descargó como archivo. Ábrelo con doble clic y pulsa «Imprimir o guardar en PDF»."
          : null
      );
    } catch {
      ventana?.close();
      setAviso(
        "No se pudieron cargar los mantenimientos en curso. Intenta de nuevo."
      );
    } finally {
      setImprimiendo(false);
    }
  }

  if (cargando) {
    return (
      <p className="px-1 py-8 text-sm text-muted-foreground">Cargando…</p>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-sm font-medium">Aún no hay documentos registrados.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pulsa <span className="font-medium">Nuevo documento</span> para
          registrar el primero.
        </p>
      </div>
    );
  }

  if (ordenados.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {hayFiltros
          ? "Ningún documento coincide con los filtros."
          : "Sin documentos."}
      </div>
    );
  }

  return (
    <>
      {/* La barra de selección va encima de la tabla y no escondida en un menú:
          sacar el estatus de un puñado de documentos es lo que más se pide, así
          que el botón tiene que estar a la vista. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3">
        <p className="text-xs text-muted-foreground">
          {seleccionados.length === 0
            ? "Marca la casilla de las filas que quieras llevar al PDF."
            : `${seleccionados.length} de ${ordenados.length} ${
                ordenados.length === 1
                  ? "documento marcado"
                  : "documentos marcados"
              }.`}
        </p>
        <div className="flex items-center gap-1">
          {seleccionados.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMarcados(new Set())}
            >
              Quitar selección
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={seleccionados.length === 0 || imprimiendo}
            onClick={imprimir}
            title="Abre el reporte y el diálogo de impresión, donde está «Guardar como PDF»"
          >
            <HugeiconsIcon icon={PrinterIcon} strokeWidth={2} />
            {imprimiendo ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {aviso && (
        <p className="mx-3 rounded-2xl bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          {aviso}
        </p>
      )}

      {/* El contenedor scrollea en horizontal; la página nunca lo hace. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-10 px-3 py-2">
                <span className="sr-only">Imprimir</span>
                <Checkbox
                  checked={todosMarcados}
                  indeterminate={seleccionados.length > 0 && !todosMarcados}
                  onCheckedChange={alternarTodos}
                  aria-label={
                    todosMarcados
                      ? "Quitar la marca de todos"
                      : "Marcar todos para imprimir"
                  }
                />
              </th>
              {COLUMNAS.map((c) => (
                <th
                  key={c.titulo}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-left text-xs font-medium text-muted-foreground",
                    c.className
                  )}
                >
                  {c.clave ? (
                    <button
                      type="button"
                      onClick={() => alternarOrden(c.clave!)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {c.titulo}
                      {orden === c.clave && (
                        <HugeiconsIcon
                          icon={ascendente ? ArrowUp01Icon : ArrowDown01Icon}
                          strokeWidth={2}
                          className="size-3"
                        />
                      )}
                    </button>
                  ) : (
                    c.titulo || <span className="sr-only">Acciones</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((d) => (
              <tr
                key={d.id}
                className="group border-b border-border/60 last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-3 align-top">
                  <Checkbox
                    checked={marcados.has(d.id)}
                    onCheckedChange={() => alternarMarca(d.id)}
                    aria-label={`Marcar ${d.nombre} para imprimir`}
                    title={`Marcar ${d.nombre} para imprimir`}
                    className="mt-0.5"
                  />
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      {d.nombre}
                      {d.estancado && (
                        <HugeiconsIcon
                          icon={Alert02Icon}
                          strokeWidth={2}
                          className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-label={`Sin movimiento hace ${d.dias_sin_movimiento} días`}
                        />
                      )}
                    </span>
                    {/* En pantallas chicas la fila lleva su propio contexto,
                        porque las columnas de empresa y tipo están ocultas. */}
                    <span className="text-xs text-muted-foreground lg:hidden">
                      {d.linea_negocio} · {d.proceso} · {d.tipo}
                    </span>
                  </div>
                </td>

                <td className="hidden px-3 py-3 align-top lg:table-cell">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: d.linea_negocio_color }}
                    />
                    {d.linea_negocio}
                  </span>
                </td>

                <td className="hidden px-3 py-3 align-top text-muted-foreground xl:table-cell">
                  {d.proceso}
                </td>

                <td className="hidden px-3 py-3 align-top md:table-cell">
                  <BadgeTipo tipo={d.tipo} />
                </td>

                <td className="px-3 py-3 align-top">
                  <Avance
                    valor={d.avance_global}
                    terminado={d.en_produccion}
                    detalle={
                      // La fecha del hito más avanzado que haya alcanzado.
                      (d.en_produccion || d.entregado_tic) && (
                        <span
                          className="text-[11px] whitespace-nowrap text-muted-foreground"
                          title={
                            d.en_produccion
                              ? "En producción desde"
                              : "Entregada a TIC el"
                          }
                        >
                          {formatearFecha(
                            d.en_produccion
                              ? d.fecha_produccion
                              : d.fecha_entrega_tic
                          )}
                        </span>
                      )
                    }
                  />
                </td>

                <td className="hidden px-3 py-3 align-top sm:table-cell">
                  <BadgeEstado estado={d.estado} />
                </td>

                <td className="hidden px-3 py-3 align-top md:table-cell">
                  <Entrega entrega={entregaDeDocumento(d)} />
                </td>

                <td className="px-3 py-3 align-top">
                  <GanchitosEnfoque
                    valor={d.responsable}
                    onCambiar={(r) => cambiarResponsable(d, r)}
                  />
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onMantenimientos(d)}
                      aria-label={`Mantenimientos de ${d.nombre}`}
                      title={
                        d.mantenimientos_total === 0
                          ? "Sin mantenimientos"
                          : `${d.mantenimientos_total} mantenimientos · ${d.mantenimientos_abiertos} sin cerrar`
                      }
                      className={cn(
                        "relative",
                        d.mantenimientos_total === 0 &&
                          "text-muted-foreground/50"
                      )}
                    >
                      <HugeiconsIcon icon={Wrench01Icon} strokeWidth={2} />
                      {/* Solo se anuncia lo que sigue abierto: un contador del
                          total sería ruido en cuanto pasen unos meses. */}
                      {d.mantenimientos_abiertos > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white tabular-nums">
                          {d.mantenimientos_abiertos}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditar(d)}
                      aria-label={`Editar ${d.nombre}`}
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPorEliminar(d)}
                      aria-label={`Eliminar ${d.nombre}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-3 pt-3 text-xs text-muted-foreground">
        {ordenados.length}{" "}
        {ordenados.length === 1 ? "documento" : "documentos"}
        {hayFiltros && ` de ${documentos.length}`}. El triángulo ámbar marca lo
        que lleva más de {DIAS_PARA_ESTANCADO} días sin movimiento.
      </p>

      <ConfirmDialog
        open={porEliminar !== null}
        onOpenChange={(abierto) => !abierto && setPorEliminar(null)}
        titulo="Eliminar documento"
        descripcion={
          <>
            Se eliminará <span className="font-medium">{porEliminar?.nombre}</span>{" "}
            de la vista. El histórico de avance se conserva.
          </>
        }
        onConfirmar={() => porEliminar && eliminar(porEliminar)}
      />
    </>
  );
}
