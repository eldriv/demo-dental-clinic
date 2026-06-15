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
  countBookedSlots,
  countCompletedSlots,
  countInOperationSlots,
  countOpenSlots,
  countPendingSlots,
  filterBookingsForDentist,
  formatDayLabel,
  formatMonthLabel,
  getBookingsForDate,
  getDayAvailability,
  getDayCellLabel,
  getDayCellSurfaceClass,
  getDayCellToneClass,
  getDaySummary,
  buildMonthDaySummaries,
  getMonthGrid,
  isPastDate,
  toDateString,
} from "@/lib/admin-calendar";
import { isAnyDentist } from "@/lib/dentist-availability";
import {
  formatBookingCalendarLabel,
  formatBookingServiceLabel,
  formatBookingTimeRange,
  isGroupBooking,
} from "@/lib/booking-group";

interface AdminCalendarViewProps {
  initialBookings: Booking[];
  initialBlocks: ScheduleBlock[];
  timeSlots: string[];
  dentists: ClinicDentist[];
  defaultDentistId?: string;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminCalendarView({
  initialBookings,
  initialBlocks,
  timeSlots,
  dentists,
  defaultDentistId,
}: AdminCalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const initialDentistId =
    defaultDentistId && dentists.some((d) => d.id === defaultDentistId)
      ? defaultDentistId
      : (dentists[0]?.id ?? "");
  const [selectedDentistId, setSelectedDentistId] = useState(initialDentistId);

  const todayString = toDateString(today);
  const selectedDentist = dentists.find((dentist) => dentist.id === selectedDentistId);

  const monthGrid = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthSummaries = useMemo(
    () => buildMonthDaySummaries(initialBookings, initialBlocks, viewYear, viewMonth, selectedDentistId || undefined),
    [initialBookings, initialBlocks, viewYear, viewMonth, selectedDentistId]
  );

  const selectedBookings = useMemo(() => {
    const dayBookings = getBookingsForDate(initialBookings, selectedDate);
    if (!selectedDentistId) return dayBookings;

    return filterBookingsForDentist(dayBookings, selectedDentistId);
  }, [initialBookings, selectedDate, selectedDentistId]);

  const availability = useMemo(() => {
    if (!selectedDentistId) return [];
    return getDayAvailability(
      initialBookings,
      initialBlocks,
      selectedDate,
      timeSlots,
      selectedDentistId
    );
  }, [initialBookings, initialBlocks, selectedDate, timeSlots, selectedDentistId]);

  const openSlots = countOpenSlots(availability);
  const bookedSlots = countBookedSlots(availability);
  const completedSlots = countCompletedSlots(availability);
  const pendingSlots = countPendingSlots(availability);
  const inOperationSlots = countInOperationSlots(availability);
  const daySummary = getDaySummary(
    initialBookings,
    initialBlocks,
    selectedDate,
    selectedDentistId || undefined
  );

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        description="View each dentist's approved schedule, pending requests, and open slots."
      />

      {dentists.length > 0 && (
        <div className="admin-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-dark">Dentist schedule</p>
            <p className="text-xs text-muted">
              Open slots exclude approved visits. Pending requests are shown separately.
            </p>
          </div>
          <select
            value={selectedDentistId}
            onChange={(e) => setSelectedDentistId(e.target.value)}
            className="input-field max-w-xs text-sm"
          >
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
                return <div key={`empty-${index}`} className="min-h-14 rounded-lg sm:min-h-16" />;
              }

              const dateString = toDateString(date);
              const summary =
                monthSummaries.get(dateString) ??
                getDaySummary(initialBookings, initialBlocks, dateString, selectedDentistId || undefined);
              const isSelected = selectedDate === dateString && !isPastDate(dateString, todayString);
              const isToday = dateString === todayString;
              const isPast = isPastDate(dateString, todayString);
              const cell = getDayCellLabel(summary, isPast);

              return (
                <button
                  key={dateString}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(dateString)}
                  aria-disabled={isPast}
                  aria-label={`${dateString}, ${cell.label}`}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition-colors sm:min-h-16 sm:rounded-xl sm:px-1.5 sm:py-2 ${getDayCellSurfaceClass(summary, isPast, isSelected)}`}
                >
                  <span
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:size-7 sm:text-sm ${
                      isToday
                        ? "bg-primary text-white"
                        : isPast
                          ? "text-muted"
                          : summary.blocked && !isPast
                            ? "text-red-800"
                            : "text-dark"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <span
                    className={`w-full truncate px-0.5 text-[10px] font-medium leading-tight sm:text-[11px] ${getDayCellToneClass(cell.tone)}`}
                  >
                    {cell.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-primary" />
              Confirmed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-slate-400" />
              Completed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-amber-500" />
              Pending
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-300" />
              On leave / blocked
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-gray-300" />
              Past
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-violet-500" />
              In session
            </span>
          </div>
        </section>

        <div className="space-y-6">
          <section className="admin-card space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-dark">{formatDayLabel(selectedDate)}</h2>
              {selectedDentist && (
                <p className="text-sm font-medium text-primary">{selectedDentist.name}</p>
              )}
              <p className="text-sm text-muted">
                {daySummary.onLeave && !daySummary.clinicBlocked
                  ? "This dentist is on leave — no appointments available."
                  : daySummary.blocked
                    ? "This day is blocked — no appointments available."
                    : `${openSlots} open · ${bookedSlots} approved · ${completedSlots} completed · ${pendingSlots} pending${
                        inOperationSlots > 0 ? ` · ${inOperationSlots} in session` : ""
                      }`}
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
                        : slot.state === "completed"
                          ? "bg-slate-100 text-slate-600"
                        : slot.state === "pending"
                          ? "bg-amber-50 text-amber-900"
                          : slot.state === "in-operation"
                            ? "bg-violet-50 text-violet-900 ring-1 ring-violet-200"
                            : slot.state === "past"
                              ? "bg-gray-100 text-gray-400 opacity-70"
                              : "bg-red-50 text-red-700"
                  }`}
                  aria-disabled={slot.state === "past"}
                >
                  <span className={`font-medium ${slot.state === "past" ? "line-through" : ""}`}>
                    {slot.time}
                  </span>
                  <span className="text-xs sm:text-left sm:text-inherit">
                    {slot.state === "open" && "Available"}
                    {slot.state === "past" && "Past — unavailable"}
                    {slot.state === "blocked" && "Blocked / on leave"}
                    {slot.state === "in-operation" && slot.booking && (
                      <span className="wrap-break-word font-medium">
                        In session · {formatBookingCalendarLabel(slot.booking)} · {formatBookingServiceLabel(slot.booking)}
                      </span>
                    )}
                    {slot.state === "booked" && slot.booking && (
                      <span className="wrap-break-word">
                        Confirmed · {formatBookingCalendarLabel(slot.booking)} · {formatBookingServiceLabel(slot.booking)}
                      </span>
                    )}
                    {slot.state === "completed" && slot.booking && (
                      <span className="wrap-break-word">
                        Completed · {formatBookingCalendarLabel(slot.booking)} · {formatBookingServiceLabel(slot.booking)}
                      </span>
                    )}
                    {slot.state === "pending" && slot.booking && (
                      <span className="wrap-break-word">
                        Pending · {formatBookingCalendarLabel(slot.booking)} · {formatBookingServiceLabel(slot.booking)}
                        {isAnyDentist(slot.booking.preferredDentistId) ? " · Any doctor" : ""}
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
                        <p className="font-semibold text-dark">{formatBookingCalendarLabel(entry)}</p>
                        <p className="text-sm text-muted">
                          {formatBookingTimeRange(entry)} · {formatBookingServiceLabel(entry)}
                          {entry.assignedDentistName ||
                          entry.preferredDentistName ||
                          findDentistName(dentists, entry.assignedDentistId) ||
                          findDentistName(dentists, entry.preferredDentistId) ? (
                            <>
                              {" "}
                              ·{" "}
                              {entry.assignedDentistName ??
                                entry.preferredDentistName ??
                                findDentistName(dentists, entry.assignedDentistId) ??
                                findDentistName(dentists, entry.preferredDentistId)}
                            </>
                          ) : isAnyDentist(entry.preferredDentistId) ? (
                            <> · Any doctor</>
                          ) : null}
                        </p>
                      </div>
                      <StatusBadge booking={entry} />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {isGroupBooking(entry) ? `Organizer: ${entry.email}` : entry.email}
                    </p>
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
