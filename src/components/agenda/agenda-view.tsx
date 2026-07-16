"use client";

import { useState } from "react";
import { DateCarousel } from "@/components/agenda/date-carousel";
import { DayActivities } from "@/components/agenda/day-activities";
import { MonthCalendarView } from "@/components/agenda/month-calendar-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLong, startOfToday } from "@/lib/date";

type ViewMode = "semana" | "mes";

export function AgendaView() {
  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfToday());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        {viewMode === "semana" ? (
          <div className="min-w-0 flex-1">
            <DateCarousel
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Historial completo de actividades
          </p>
        )}

        <div className="flex shrink-0 gap-1 rounded-full border border-border p-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setViewMode("semana")}
            className={cn(
              "rounded-full",
              viewMode === "semana" && "bg-primary text-primary-foreground"
            )}
          >
            Semana
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setViewMode("mes")}
            className={cn(
              "rounded-full",
              viewMode === "mes" && "bg-primary text-primary-foreground"
            )}
          >
            Mes
          </Button>
        </div>
      </div>

      {viewMode === "semana" ? (
        <>
          <p className="-mt-4 text-sm text-muted-foreground">
            Mostrando actividades de{" "}
            <span className="font-medium text-foreground">
              {formatLong(selectedDate)}
            </span>
          </p>
          <DayActivities date={selectedDate} />
        </>
      ) : (
        <MonthCalendarView />
      )}
    </div>
  );
}
