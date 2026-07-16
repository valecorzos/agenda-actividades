"use client";

import { cn } from "@/lib/utils";
import {
  formatWeekdayShort,
  getLastSevenDays,
  isSameDay,
  toDateKey,
} from "@/lib/date";

type DateCarouselProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export function DateCarousel({ selectedDate, onSelectDate }: DateCarouselProps) {
  const days = getLastSevenDays();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        return (
          <button
            key={toDateKey(day)}
            type="button"
            onClick={() => onSelectDate(day)}
            aria-pressed={isSelected}
            className={cn(
              "flex min-w-16 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="text-xs font-medium uppercase opacity-80">
              {formatWeekdayShort(day)}
            </span>
            <span className="text-lg font-semibold">{day.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
