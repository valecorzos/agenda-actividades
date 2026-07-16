"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/types";

type ActivityCardProps = {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
};

export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {activity.categoria}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onEdit}
            aria-label="Editar actividad"
          >
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label="Eliminar actividad"
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          </Button>
        </div>
      </div>
      <p className="text-sm text-foreground">{activity.descripcion}</p>
    </div>
  );
}
