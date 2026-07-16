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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CATEGORIAS, USUARIOS } from "@/lib/types";
import type { Activity, Categoria, Usuario } from "@/lib/types";

export type ActivityFormValues = {
  usuario: Usuario;
  categoria: Categoria;
  descripcion: string;
};

type ActivityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  defaultUsuario: Usuario;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
};

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaultUsuario,
  onSubmit,
}: ActivityDialogProps) {
  const [usuario, setUsuario] = useState<Usuario>(defaultUsuario);
  const [categoria, setCategoria] = useState<Categoria>("Desarrollo");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsuario(activity?.usuario ?? defaultUsuario);
    setCategoria(activity?.categoria ?? "Desarrollo");
    setDescripcion(activity?.descripcion ?? "");
    setError(null);
  }, [open, activity, defaultUsuario]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!descripcion.trim()) {
      setError("La descripción no puede estar vacía.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ usuario, categoria, descripcion: descripcion.trim() });
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar la actividad. Intenta de nuevo.");
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
              {activity ? "Editar actividad" : "Nueva actividad"}
            </DialogTitle>
            <DialogDescription>
              Registra la tarea con su usuario y categoría correspondiente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Usuario</label>
              <Select
                value={usuario}
                onValueChange={(value) => setUsuario(value as Usuario)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USUARIOS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={categoria}
                onValueChange={(value) => setCategoria(value as Categoria)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Describe la actividad..."
                rows={3}
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
