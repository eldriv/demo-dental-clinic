import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import {
  CALENDAR_ACTIVE_STATUSES,
  formatMonthLabel,
  getMonthGrid,
  toDateString,
} from "@/lib/admin-calendar";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface AdminCalendarOverviewProps {
  bookings: Booking[];
}

function datesInRange(start: Date, days: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push(toDateString(d));
  }
  return result;
}

export function AdminCalendarOverview({ bookings }: AdminCalendarOverviewProps) {
  const today = new Date();
  const todayString = toDateString(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthLabel = formatMonthLabel(year, month);
  const monthGrid = getMonthGrid(year, month);

  const activeBookings = bookings.filter((b) => CALENDAR_ACTIVE_STATUSES.includes(b.status));

  const bookedDates = new Set(activeBookings.map((b) => b.date));
  const weekDates = datesInRange(today, 7);
  const thisWeekCount = activeBookings.filter((b) => weekDates.includes(b.date)).length;
  const todayCount = activeBookings.filter((b) => b.date === todayString).length;
  const monthCount = activeBookings.filter((b) => {
    const d = new Date(`${b.date}T12:00:00`);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  return (
    <Link
      href="/admin/calendar"
      className="admin-card group block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(26,60,52,0.1)]"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark">Clinic calendar</h2>
              <p className="mt-0.5 text-sm text-muted">
                See confirmed visits, open slots, and blocked days at a glance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {todayCount} today
            </span>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-dark">
              {thisWeekCount} this week
            </span>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
              {monthCount} in {monthLabel.split(" ")[0]}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:gap-2.5">
            View full calendar
            <ArrowRight className="size-4" />
          </span>
        </div>

        <div className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
            {monthLabel}
          </p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={`${label}-${i}`} className="py-1 text-[10px] font-semibold text-muted">
                {label}
              </span>
            ))}
            {monthGrid.map((date, index) => {
              if (!date) {
                return <span key={`empty-${index}`} />;
              }

              const dateString = toDateString(date);
              const isToday = dateString === todayString;
              const hasBookings = bookedDates.has(dateString);

              return (
                <span
                  key={dateString}
                  className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium ${
                    isToday
                      ? "bg-primary text-white"
                      : hasBookings
                        ? "bg-primary/10 text-primary"
                        : "text-dark"
                  }`}
                >
                  {date.getDate()}
                  {hasBookings && !isToday && (
                    <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}
