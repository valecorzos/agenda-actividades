"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DayActivities } from "@/components/agenda/day-activities";
import { cn } from "@/lib/utils";
import {
  addMonths,
  formatLong,
  formatMonthYear,
  getMonthGridDays,
  isSameDay,
  startOfMonth,
  startOfToday,
  toDateKey,
} from "@/lib/date";
import { fetchActivitiesByDateRange } from "@/lib/supabase/activities";
import type { Activity } from "@/lib/types";

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MAX_CHIPS_PER_DAY = 3;

const USUARIO_CHIP_CLASS: Record<Activity["usuario"], string> = {
  Juan: "bg-accent text-accent-foreground",
  Valentina: "bg-secondary text-secondary-foreground",
};

export function MonthCalendarView() {
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(startOfToday())
  );
  const [activitiesByDay, setActivitiesByDay] = useState<
    Map<string, Activity[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => getMonthGridDays(viewMonth), [viewMonth]);
  const today = useMemo(() => startOfToday(), []);

  const loadMonth = useCallback(async (month: Date) => {
    setLoading(true);
    setError(null);
    try {
      const gridDays = getMonthGridDays(month);
      const data = await fetchActivitiesByDateRange(
        toDateKey(gridDays[0]),
        toDateKey(gridDays[gridDays.length - 1])
      );
      const grouped = new Map<string, Activity[]>();
      for (const activity of data) {
        const list = grouped.get(activity.fecha) ?? [];
        list.push(activity);
        grouped.set(activity.fecha, list);
      }
      setActivitiesByDay(grouped);
    } catch {
      setError("No se pudieron cargar las actividades del mes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonth(viewMonth);
  }, [viewMonth, loadMonth]);

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedDay(null);
      loadMonth(viewMonth);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Mes anterior"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <p className="text-sm font-medium text-foreground">
          {formatMonthYear(viewMonth)}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Mes siguiente"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(day, today);
          const dayActivities = activitiesByDay.get(dateKey) ?? [];
          const visibleChips = dayActivities.slice(0, MAX_CHIPS_PER_DAY);
          const overflowCount = dayActivities.length - visibleChips.length;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex min-h-16 flex-col gap-1 rounded-lg border border-border p-1 text-left align-top transition-colors hover:bg-accent/50 sm:min-h-24 sm:p-1.5",
                !inMonth && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "self-end text-xs",
                  isToday
                    ? "flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visibleChips.map((activity) => (
                  <span
                    key={activity.id}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                      USUARIO_CHIP_CLASS[activity.usuario]
                    )}
                  >
                    {activity.descripcion}
                  </span>
                ))}
                {overflowCount > 0 && (
                  <span className="text-[11px] font-medium text-primary">
                    +{overflowCount} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Cargando actividades...</p>
      )}

      <Dialog open={selectedDay !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? formatLong(selectedDay) : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && <DayActivities date={selectedDay} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
