import type { Booking } from "./bookings";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked, isDateBlocked } from "./schedule-block-utils";
import {
  countDentistOpenSlots,
  getDentistDayAvailability,
  isAnyDentist,
  type DentistSlotAvailability,
} from "./dentist-availability";

export const CALENDAR_ACTIVE_STATUSES: Booking["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
  "completed",
];

export const CALENDAR_BOOKED_STATUSES: Booking["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
];

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastDate(dateString: string, todayString = toDateString(new Date())): boolean {
  return dateString < todayString;
}

export function parseDateString(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatDayLabel(dateString: string): string {
  return parseDateString(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getMonthGrid(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function getBookingsForDate(bookings: Booking[], date: string): Booking[] {
  return bookings
    .filter(
      (booking) =>
        booking.date === date && CALENDAR_ACTIVE_STATUSES.includes(booking.status)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function filterBookingsForDentist(
  bookings: Booking[],
  dentistId: string
): Booking[] {
  return bookings.filter((booking) => {
    if (booking.assignedDentistId === dentistId) return true;
    if (booking.preferredDentistId === dentistId) return true;
    if (
      isAnyDentist(booking.preferredDentistId) &&
      isAnyDentist(booking.assignedDentistId)
    ) {
      return true;
    }
    return false;
  });
}

export function buildMonthDaySummaries(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  year: number,
  month: number,
  dentistId?: string
): Map<string, ReturnType<typeof getDaySummary>> {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const byDate = new Map<string, Booking[]>();

  for (const booking of bookings) {
    if (!booking.date.startsWith(prefix)) continue;
    if (!CALENDAR_ACTIVE_STATUSES.includes(booking.status)) continue;
    const list = byDate.get(booking.date);
    if (list) list.push(booking);
    else byDate.set(booking.date, [booking]);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const summaries = new Map<string, ReturnType<typeof getDaySummary>>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${prefix}-${String(day).padStart(2, "0")}`;
    let dayBookings = byDate.get(date) ?? [];
    if (dentistId) {
      dayBookings = filterBookingsForDentist(dayBookings, dentistId);
    }

    const clinicBlocked = isClinicWideDateBlocked(date, blocks);
    const onLeave = dentistId ? isDateBlocked(date, blocks, dentistId) : false;

    summaries.set(date, {
      total: dayBookings.length,
      confirmed: dayBookings.filter(
        (b) => b.status === "confirmed" || b.status === "rescheduled" || b.status === "completed"
      ).length,
      pending: dayBookings.filter((b) => b.status === "pending").length,
      blocked: clinicBlocked || onLeave,
      clinicBlocked,
      onLeave,
    });
  }

  return summaries;
}

export function getDaySummary(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  dentistId?: string
): {
  total: number;
  confirmed: number;
  pending: number;
  blocked: boolean;
  clinicBlocked: boolean;
  onLeave: boolean;
} {
  let dayBookings = getBookingsForDate(bookings, date);
  if (dentistId) {
    dayBookings = filterBookingsForDentist(dayBookings, dentistId);
  }

  const clinicBlocked = isClinicWideDateBlocked(date, blocks);
  const onLeave = dentistId ? isDateBlocked(date, blocks, dentistId) : false;

  return {
    total: dayBookings.length,
    confirmed: dayBookings.filter(
      (b) => b.status === "confirmed" || b.status === "rescheduled" || b.status === "completed"
    ).length,
    pending: dayBookings.filter((b) => b.status === "pending").length,
    blocked: clinicBlocked || onLeave,
    clinicBlocked,
    onLeave,
  };
}

export type DayCellTone = "past" | "leave" | "blocked" | "pending" | "confirmed" | "open";

export function getDayCellLabel(
  summary: ReturnType<typeof getDaySummary>,
  isPast: boolean
): { label: string; tone: DayCellTone } {
  if (isPast) return { label: "Past", tone: "past" };
  if (summary.onLeave && !summary.clinicBlocked) return { label: "On leave", tone: "leave" };
  if (summary.clinicBlocked) return { label: "Blocked", tone: "blocked" };
  if (summary.pending > 0) {
    return { label: `${summary.pending} pending`, tone: "pending" };
  }
  if (summary.confirmed > 0) {
    return { label: `${summary.confirmed} confirmed`, tone: "confirmed" };
  }
  return { label: "Open", tone: "open" };
}

const dayCellToneClasses: Record<DayCellTone, string> = {
  past: "text-muted",
  leave: "text-red-700",
  blocked: "text-red-700",
  pending: "text-amber-700",
  confirmed: "text-primary",
  open: "text-muted",
};

export function getDayCellToneClass(tone: DayCellTone): string {
  return dayCellToneClasses[tone];
}

export function getDayCellSurfaceClass(
  summary: ReturnType<typeof getDaySummary>,
  isPast: boolean,
  isSelected: boolean
): string {
  if (isPast) {
    return "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50";
  }

  if (summary.onLeave && !summary.clinicBlocked) {
    return isSelected
      ? "border-red-300 bg-red-50 ring-1 ring-primary/30"
      : "border-red-100 bg-red-50/70 hover:border-red-200";
  }

  if (summary.clinicBlocked) {
    return isSelected
      ? "border-red-300 bg-red-50 ring-1 ring-primary/30"
      : "border-red-100 bg-red-50/70 hover:border-red-200";
  }

  return isSelected
    ? "border-primary bg-primary/10"
    : "border-gray-100 bg-white hover:border-primary/30 hover:bg-surface";
}

export type SlotAvailability = DentistSlotAvailability;

export function getDayAvailability(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  timeSlots: string[],
  dentistId: string
): SlotAvailability[] {
  return getDentistDayAvailability(bookings, blocks, date, timeSlots, dentistId);
}

export function countOpenSlots(availability: SlotAvailability[]): number {
  return countDentistOpenSlots(availability);
}

export function countBookedSlots(availability: SlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "booked" || slot.state === "in-operation").length;
}

export function countCompletedSlots(availability: SlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "completed").length;
}

export function countPendingSlots(availability: SlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "pending").length;
}

export function countInOperationSlots(availability: SlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "in-operation").length;
}
