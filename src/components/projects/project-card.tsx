"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { EstadoProyecto, Project } from "@/lib/types";

const ESTADO_BADGE: Record<EstadoProyecto, string> = {
  Planificación: "bg-muted text-muted-foreground",
  "En progreso": "bg-accent text-accent-foreground",
  Completado: "bg-primary text-primary-foreground",
  Pausado: "bg-secondary text-secondary-foreground",
};

type ProjectCardProps = {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{project.nombre}</p>
          <span
            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[project.estado]}`}
          >
            {project.estado}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onEdit}
            aria-label="Editar proyecto"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label="Eliminar proyecto"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Avance</span>
          <span>{project.porcentaje_avance}%</span>
        </div>
        <Progress value={project.porcentaje_avance} />
      </div>
    </div>
  );
}
