"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/agenda/activity-card";
import type { Activity, Usuario } from "@/lib/types";

type ActivityColumnProps = {
  usuario: Usuario;
  activities: Activity[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
};

export function ActivityColumn({
  usuario,
  activities,
  loading,
  onAdd,
  onEdit,
  onDelete,
}: ActivityColumnProps) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{usuario}</CardTitle>
        <CardAction>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onAdd}
            aria-label={`Agregar actividad para ${usuario}`}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && activities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin actividades registradas.
          </p>
        )}
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onEdit={() => onEdit(activity)}
            onDelete={() => onDelete(activity)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
