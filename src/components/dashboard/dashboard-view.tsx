"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { HtmlFile01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  BarrasProgreso,
  GraficoAnillo,
  GraficoColumnas,
  Leyenda,
  TarjetaGrafico,
} from "@/components/dashboard/piezas-grafico";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import { construirModelo } from "@/lib/dashboard/modelo";
import { descargarDashboard } from "@/lib/dashboard/exportar-html";

export function DashboardView() {
  const { visibles, documentos, cargando, hayFiltros } = useDocumentos();
  const [descargado, setDescargado] = React.useState(false);

  const modelo = React.useMemo(
    () => construirModelo(visibles, documentos.length, hayFiltros),
    [visibles, documentos.length, hayFiltros]
  );

  // El aviso de "listo" se limpia solo. El temporizador se cancela al
  // desmontar para no llamar a `setState` sobre un componente que ya no está.
  React.useEffect(() => {
    if (!descargado) return;
    const id = setTimeout(() => setDescargado(false), 2500);
    return () => clearTimeout(id);
  }, [descargado]);

  if (cargando) {
    return <p className="py-10 text-sm text-muted-foreground">Cargando…</p>;
  }

  if (documentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        El dashboard se llena a medida que registres documentos.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {hayFiltros
            ? `El tablero refleja los ${modelo.total} de ${documentos.length} documentos que dejan pasar los filtros.`
            : `Cartera completa: ${documentos.length} ${
                documentos.length === 1 ? "documento" : "documentos"
              }.`}
        </p>

        {/* El archivo sale con el recorte que hay en pantalla, filtros
            incluidos: lo que se ve es lo que se descarga. */}
        <Button
          variant="outline"
          onClick={() => {
            descargarDashboard(modelo);
            setDescargado(true);
          }}
          title="Descarga un archivo .html con este mismo tablero, para abrir con doble clic sin conexión"
        >
          <HugeiconsIcon
            icon={descargado ? Tick02Icon : HtmlFile01Icon}
            strokeWidth={2}
          />
          {descargado ? "Archivo descargado" : "Generar HTML"}
        </Button>
      </div>

      {/* Dos tarjetas cortas apiladas a la izquierda y el anillo a la derecha:
          emparejarlas con el anillo —alto por naturaleza— evita el hueco
          muerto que dejarían solas en una fila. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <TarjetaGrafico
            titulo="Distribución del portafolio por tipo"
            descripcion="Qué clase de entregables está produciendo el equipo."
          >
            <GraficoColumnas items={modelo.porTipo} />
          </TarjetaGrafico>

          <TarjetaGrafico
            titulo="% de progreso por área"
            descripcion="Avance promedio de cada línea de negocio, de mayor a menor."
          >
            <BarrasProgreso items={modelo.progresoArea} />
          </TarjetaGrafico>
        </div>

        <TarjetaGrafico
          titulo="Estatus general de los proyectos"
          descripcion={`${modelo.avancePromedio}% de avance promedio de la cartera.`}
          leyenda={
            <Leyenda
              items={modelo.estatus
                .filter((s) => s.cantidad > 0)
                .map((s) => ({ etiqueta: s.etiqueta, color: s.color }))}
            />
          }
        >
          {/* El anillo se centra en el alto que le deje la columna de al lado,
              en vez de quedarse pegado al título. */}
          <div className="flex flex-1 items-center">
            <GraficoAnillo segmentos={modelo.estatus} total={modelo.total} />
          </div>
        </TarjetaGrafico>
      </div>
    </div>
  );
}
