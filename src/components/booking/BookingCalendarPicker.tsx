"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  formatBookingMonthLabel,
  formatBookingWeekRange,
  getBookingMonthGrid,
  getMonthsForWeek,
  getWeekDates,
  startOfWeek,
  toDateString,
  type BookingDayAvailability,
  type BookingDayStatus,
} from "@/lib/booking-calendar";

interface BookingCalendarPickerProps {
  id: string;
  name: string;
  value: string;
  onChange: (date: string) => void;
  dentistId: string;
  excludeToken?: string;
  disabled?: boolean;
  embedded?: boolean;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function statusForDate(
  days: BookingDayAvailability[],
  dateString: string
): BookingDayStatus | undefined {
  return days.find((day) => day.date === dateString)?.status;
}

function initialWeekStart(value: string | undefined, today: Date): Date {
  const anchor = value ? new Date(`${value}T12:00:00`) : today;
  return startOfWeek(anchor);
}

function dayButtonClass(
  dayStatus: BookingDayStatus,
  isSelected: boolean,
  compact: boolean
): string {
  const size = compact ? "h-8 rounded-md text-xs" : "aspect-square min-h-9 flex-col rounded-lg text-sm";

  if (isSelected) {
    return `flex items-center justify-center transition-colors ${size} bg-primary font-semibold text-white shadow-sm`;
  }

  if (dayStatus === "available") {
    return `flex items-center justify-center transition-colors ${size} bg-green-50 font-medium text-dark hover:bg-green-100`;
  }

  if (dayStatus === "full") {
    return `flex items-center justify-center transition-colors ${size} cursor-not-allowed bg-gray-50 text-muted`;
  }

  if (dayStatus === "closed") {
    return `flex items-center justify-center transition-colors ${size} cursor-not-allowed bg-red-50/60 text-red-400`;
  }

  return `flex items-center justify-center transition-colors ${size} cursor-not-allowed text-gray-300`;
}

async function fetchMonthAvailability(
  year: number,
  month: number,
  dentistId: string,
  excludeToken?: string
): Promise<BookingDayAvailability[]> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    dentistId,
  });
  if (excludeToken) params.set("excludeToken", excludeToken);

  const response = await fetch(`/api/availability/month?${params}`);
  const data = await response.json();
  return data.days ?? [];
}

export function BookingCalendarPicker({
  id,
  name,
  value,
  onChange,
  dentistId,
  excludeToken,
  disabled = false,
  embedded = false,
}: BookingCalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(
    value ? new Date(`${value}T12:00:00`).getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    value ? new Date(`${value}T12:00:00`).getMonth() : today.getMonth()
  );
  const [viewWeekStart, setViewWeekStart] = useState(() => initialWeekStart(value, today));
  const [days, setDays] = useState<BookingDayAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const monthGrid = useMemo(
    () => getBookingMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const weekDates = useMemo(() => getWeekDates(viewWeekStart), [viewWeekStart]);

  useEffect(() => {
    if (!value) return;
    const weekStart = startOfWeek(new Date(`${value}T12:00:00`));
    setViewWeekStart((current) =>
      toDateString(current) === toDateString(weekStart) ? current : weekStart
    );
  }, [value]);

  useEffect(() => {
    setLoading(true);

    if (embedded) {
      const months = getMonthsForWeek(viewWeekStart);

      Promise.all(
        months.map(({ year, month }) =>
          fetchMonthAvailability(year, month, dentistId, excludeToken)
        )
      )
        .then((results) => {
          const merged = new Map<string, BookingDayAvailability>();
          for (const monthDays of results) {
            for (const day of monthDays) {
              merged.set(day.date, day);
            }
          }
          setDays(Array.from(merged.values()));
        })
        .catch(() => setDays([]))
        .finally(() => setLoading(false));

      return;
    }

    fetchMonthAvailability(viewYear, viewMonth, dentistId, excludeToken)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [embedded, viewWeekStart, viewYear, viewMonth, dentistId, excludeToken]);

  useEffect(() => {
    if (!value) return;
    const selectedStatus = statusForDate(days, value);
    if (selectedStatus && selectedStatus !== "available") {
      onChange("");
    }
  }, [days, value, onChange]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function shiftWeek(delta: number) {
    setViewWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function handleSelect(dateString: string) {
    const dayStatus = statusForDate(days, dateString);
    if (dayStatus !== "available") return;
    onChange(dateString);
  }

  function renderDayButton(date: Date, compact: boolean) {
    const dateString = toDateString(date);
    const dayStatus = statusForDate(days, dateString) ?? "past";
    const isSelected = value === dateString;
    const isSelectable = dayStatus === "available";

    return (
      <button
        key={dateString}
        type="button"
        disabled={!isSelectable || loading}
        onClick={() => handleSelect(dateString)}
        aria-label={`${dateString}, ${dayStatus}`}
        aria-pressed={isSelected}
        className={dayButtonClass(dayStatus, isSelected, compact)}
      >
        <span
          className={
            dayStatus === "full" || dayStatus === "closed"
              ? "line-through decoration-current/70"
              : ""
          }
        >
          {date.getDate()}
        </span>
      </button>
    );
  }

  if (embedded) {
    return (
      <div className={disabled ? "pointer-events-none opacity-60" : ""}>
        <input type="hidden" id={id} name={name} value={value} required={!disabled} />

        <div className="mb-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg p-1 text-dark hover:bg-surface"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex min-w-0 flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-dark">
              <span className="truncate">{formatBookingWeekRange(viewWeekStart)}</span>
              {loading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-green-500" />
                Open
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-gray-300" />
                Full
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-red-300" />
                Closed
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg p-1 text-dark hover:bg-surface"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mb-0.5 grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-muted"
            >
              {label.slice(0, 1)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {weekDates.map((date) => renderDayButton(date, true))}
        </div>
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <input type="hidden" id={id} name={name} value={value} required={!disabled} />

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-2 text-dark hover:bg-surface"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-dark sm:text-base">
            {formatBookingMonthLabel(viewYear, viewMonth)}
            {loading && <Loader2 className="size-4 animate-spin text-muted" />}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-2 text-dark hover:bg-surface"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
            >
              <span className="sm:hidden">{label.slice(0, 1)}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square min-h-9" />;
            }

            return renderDayButton(date, false);
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-green-500" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-gray-300 line-through" />
            Full
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-300" />
            Closed
          </span>
        </div>
      </div>
    </div>
  );
}
