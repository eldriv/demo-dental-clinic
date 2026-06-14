"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import type { ScheduleBlock } from "@/lib/schedule-block-utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { ClinicDentist } from "@/lib/dentists";
import { findDentistName } from "@/lib/dentists";
import {
  countOpenSlots,
  formatDayLabel,
  formatMonthLabel,
  getBookingsForDate,
  getDayAvailability,
  getDaySummary,
  getMonthGrid,
  isPastDate,
  toDateString,
} from "@/lib/admin-calendar";

interface AdminCalendarViewProps {
  initialBookings: Booking[];
  initialBlocks: ScheduleBlock[];
  timeSlots: string[];
  dentists: ClinicDentist[];
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminCalendarView({
  initialBookings,
  initialBlocks,
  timeSlots,
  dentists,
}: AdminCalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateString(today));

  const todayString = toDateString(today);

  const monthGrid = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedBookings = useMemo(
    () => getBookingsForDate(initialBookings, selectedDate),
    [initialBookings, selectedDate]
  );

  const availability = useMemo(
    () =>
      getDayAvailability(
        initialBookings,
        initialBlocks,
        selectedDate,
        timeSlots
      ),
    [initialBookings, initialBlocks, selectedDate, timeSlots]
  );

  const openSlots = countOpenSlots(availability);
  const daySummary = getDaySummary(initialBookings, initialBlocks, selectedDate);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        description="View confirmed appointments and open time slots at a glance."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="admin-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-2 hover:bg-surface"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-lg font-semibold text-dark">
              {formatMonthLabel(viewYear, viewMonth)}
            </h2>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-2 hover:bg-surface"
              aria-label="Next month"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-0.5 sm:gap-1">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:py-2 sm:text-xs"
              >
                <span className="sm:hidden">{label.slice(0, 1)}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {monthGrid.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-12 rounded-lg sm:min-h-20 sm:rounded-xl" />;
              }

              const dateString = toDateString(date);
              const summary = getDaySummary(initialBookings, initialBlocks, dateString);
              const isSelected = selectedDate === dateString && !isPastDate(dateString, todayString);
              const isToday = dateString === todayString;
              const isPast = isPastDate(dateString, todayString);

              return (
                <button
                  key={dateString}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateString)}
                  aria-disabled={isPast}
                  className={`min-h-12 rounded-lg border p-1 text-left transition-colors sm:min-h-20 sm:rounded-xl sm:p-2 ${
                    isPast
                      ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                      : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-gray-100 bg-white hover:border-primary/30 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold sm:size-7 sm:text-sm ${
                        isToday
                          ? "bg-primary text-white"
                          : isPast
                            ? "text-muted"
                            : "text-dark"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {summary.blocked && !isPast && (
                      <span className="rounded-full bg-red-100 px-1 py-0.5 text-[8px] font-semibold text-red-700 sm:px-1.5 sm:text-[10px]">
                        Blocked
                      </span>
                    )}
                  </div>

                  {!isPast && summary.total > 0 && (
                    <span className="mt-1 block size-1.5 rounded-full bg-primary sm:hidden" aria-hidden />
                  )}

                  <div className="mt-1 hidden space-y-1 sm:mt-2 sm:block">
                    {isPast ? (
                      <span className="block text-[11px] text-muted">Past</span>
                    ) : (
                      <>
                        {summary.confirmed > 0 && (
                          <span className="block text-[11px] font-medium text-primary">
                            {summary.confirmed} confirmed
                          </span>
                        )}
                        {summary.pending > 0 && (
                          <span className="block text-[11px] font-medium text-amber-700">
                            {summary.pending} pending
                          </span>
                        )}
                        {!summary.blocked && summary.total === 0 && (
                          <span className="block text-[11px] text-muted">Open</span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-primary" />
              Confirmed / completed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-amber-500" />
              Pending
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-400" />
              Blocked day
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-gray-300" />
              Past (unavailable)
            </span>
          </div>
        </section>

        <div className="space-y-6">
          <section className="admin-card space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-dark">{formatDayLabel(selectedDate)}</h2>
              <p className="text-sm text-muted">
                {daySummary.blocked
                  ? "This day is blocked — no appointments available."
                  : `${openSlots} of ${timeSlots.length} slots open`}
              </p>
            </div>

            <div className="grid gap-2">
              {availability.map((slot) => (
                <div
                  key={slot.time}
                  className={`flex flex-col gap-1 rounded-xl px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${
                    slot.state === "open"
                      ? "bg-green-50 text-green-800"
                      : slot.state === "booked"
                        ? "bg-primary/10 text-dark"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  <span className="font-medium">{slot.time}</span>
                  <span className="text-xs sm:text-left sm:text-inherit">
                    {slot.state === "open" && "Available"}
                    {slot.state === "blocked" && "Blocked"}
                    {slot.state === "booked" && slot.booking && (
                      <span className="break-words">
                        {slot.booking.name} · {slot.booking.service}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-card space-y-4">
            <h3 className="font-semibold text-dark">Appointments this day</h3>
            {selectedBookings.length === 0 ? (
              <p className="text-sm text-muted">No appointments scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedBookings.map((entry) => (
                  <div
                    key={entry.token}
                    className="rounded-xl border border-gray-100 bg-surface/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-dark">{entry.name}</p>
                        <p className="text-sm text-muted">
                          {entry.time} · {entry.service}
                          {entry.assignedDentistName ||
                            findDentistName(dentists, entry.assignedDentistId) ? (
                            <>
                              {" "}
                              ·{" "}
                              {entry.assignedDentistName ??
                                findDentistName(dentists, entry.assignedDentistId)}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <StatusBadge booking={entry} />
                    </div>
                    <p className="mt-2 text-xs text-muted">{entry.email}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
