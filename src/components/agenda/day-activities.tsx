"use client";

import { useCallback, useEffect, useState } from "react";
import { ActivityColumn } from "@/components/agenda/activity-column";
import {
  ActivityDialog,
  type ActivityFormValues,
} from "@/components/agenda/activity-dialog";
import { toDateKey } from "@/lib/date";
import {
  createActivity,
  deleteActivity,
  fetchActivitiesByDate,
  updateActivity,
} from "@/lib/supabase/activities";
import type { Activity, Usuario } from "@/lib/types";

type DayActivitiesProps = {
  date: Date;
};

export function DayActivities({ date }: DayActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogUsuario, setDialogUsuario] = useState<Usuario>("Juan");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const loadActivities = useCallback(async (forDate: Date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivitiesByDate(toDateKey(forDate));
      setActivities(data);
    } catch {
      setError("No se pudieron cargar las actividades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities(date);
  }, [date, loadActivities]);

  function openCreateDialog(usuario: Usuario) {
    setEditingActivity(null);
    setDialogUsuario(usuario);
    setDialogOpen(true);
  }

  function openEditDialog(activity: Activity) {
    setEditingActivity(activity);
    setDialogUsuario(activity.usuario);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ActivityFormValues) {
    if (editingActivity) {
      await updateActivity(editingActivity.id, values);
    } else {
      await createActivity({ ...values, fecha: toDateKey(date) });
    }
    await loadActivities(date);
  }

  async function handleDelete(activity: Activity) {
    const previous = activities;
    setActivities((current) => current.filter((a) => a.id !== activity.id));
    try {
      await deleteActivity(activity.id);
    } catch {
      setActivities(previous);
      setError("No se pudo eliminar la actividad.");
    }
  }

  const juanActivities = activities.filter((a) => a.usuario === "Juan");
  const valentinaActivities = activities.filter((a) => a.usuario === "Valentina");

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <ActivityColumn
          usuario="Juan"
          activities={juanActivities}
          loading={loading}
          onAdd={() => openCreateDialog("Juan")}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />
        <ActivityColumn
          usuario="Valentina"
          activities={valentinaActivities}
          loading={loading}
          onAdd={() => openCreateDialog("Valentina")}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />
      </div>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        defaultUsuario={dialogUsuario}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
