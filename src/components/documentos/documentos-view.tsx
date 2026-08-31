"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Table01Icon,
  Analytics01Icon,
} from "@hugeicons/core-free-icons";

import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DocumentosFiltros } from "@/components/documentos/documentos-filtros";
import { DocumentosTabla } from "@/components/documentos/documentos-tabla";
import { DocumentoSheet } from "@/components/documentos/documento-sheet";
import { MantenimientosSheet } from "@/components/documentos/mantenimientos-sheet";
import { LeyendaFases } from "@/components/documentos/piezas";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useDocumentos } from "@/components/documentos/documentos-provider";
import type { Documento } from "@/lib/documentos";

export function DocumentosView() {
  const { error } = useDocumentos();
  const [abierto, setAbierto] = React.useState(false);
  const [enEdicion, setEnEdicion] = React.useState<Documento | null>(null);
  const [mantenimientosDe, setMantenimientosDe] =
    React.useState<Documento | null>(null);

  function abrirNuevo() {
    setEnEdicion(null);
    setAbierto(true);
  }

  function abrirEdicion(documento: Documento) {
    setEnEdicion(documento);
    setAbierto(true);
  }

  return (
    <>
      <Tabs defaultValue="documentos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTab value="documentos">
              <HugeiconsIcon
                icon={Table01Icon}
                strokeWidth={2}
                className="size-4"
              />
              Documentos
            </TabsTab>
            <TabsTab value="dashboard">
              <HugeiconsIcon
                icon={Analytics01Icon}
                strokeWidth={2}
                className="size-4"
              />
              Dashboard
            </TabsTab>
            <TabsIndicator />
          </TabsList>

          <Button onClick={abrirNuevo}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Nuevo documento
          </Button>
        </div>

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Los filtros viven fuera de los paneles: filtrar en la tabla y saltar
            al dashboard conserva el mismo recorte. */}
        <DocumentosFiltros />

        <TabsPanel value="documentos">
          <div className="flex flex-col gap-3 rounded-2xl bg-card py-4 ring-1 ring-foreground/10">
            <DocumentosTabla
              onEditar={abrirEdicion}
              onMantenimientos={setMantenimientosDe}
            />
            <LeyendaFases className="px-3 pt-1" />
          </div>
        </TabsPanel>

        <TabsPanel value="dashboard">
          <DashboardView />
        </TabsPanel>
      </Tabs>

      <DocumentoSheet
        open={abierto}
        onOpenChange={setAbierto}
        documento={enEdicion}
      />

      <MantenimientosSheet
        open={mantenimientosDe !== null}
        onOpenChange={(abre) => !abre && setMantenimientosDe(null)}
        documento={mantenimientosDe}
      />
    </>
  );
}
