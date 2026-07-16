"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ESTADOS_PROYECTO } from "@/lib/types";
import type { EstadoProyecto, Project } from "@/lib/types";

export type ProjectFormValues = {
  nombre: string;
  estado: EstadoProyecto;
  porcentaje_avance: number;
};

type ProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
};

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: ProjectDialogProps) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState<EstadoProyecto>("Planificación");
  const [porcentaje, setPorcentaje] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNombre(project?.nombre ?? "");
    setEstado(project?.estado ?? "Planificación");
    setPorcentaje(String(project?.porcentaje_avance ?? 0));
    setError(null);
  }, [open, project]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    const porcentajeNum = Math.min(100, Math.max(0, Number(porcentaje) || 0));
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        estado,
        porcentaje_avance: porcentajeNum,
      });
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar el proyecto. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>
              {project ? "Editar proyecto" : "Nuevo proyecto"}
            </DialogTitle>
            <DialogDescription>
              Registra el avance del proyecto para la vista general.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Nombre del proyecto"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={estado}
                onValueChange={(value) => setEstado(value as EstadoProyecto)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_PROYECTO.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Porcentaje de avance</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={porcentaje}
                onChange={(event) => setPorcentaje(event.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
