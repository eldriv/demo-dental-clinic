import type { Booking } from "@/lib/bookings";
import type { ScheduleBlock } from "@/lib/schedule-block-utils";
import { isClinicWideDateBlocked } from "@/lib/schedule-block-utils";

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

export function getDaySummary(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string
): {
  total: number;
  confirmed: number;
  pending: number;
  blocked: boolean;
} {
  const dayBookings = getBookingsForDate(bookings, date);
  return {
    total: dayBookings.length,
    confirmed: dayBookings.filter(
      (b) => b.status === "confirmed" || b.status === "rescheduled" || b.status === "completed"
    ).length,
    pending: dayBookings.filter((b) => b.status === "pending").length,
    blocked: isClinicWideDateBlocked(date, blocks),
  };
}

export interface SlotAvailability {
  time: string;
  state: "open" | "booked" | "blocked";
  booking?: Booking;
}

export function getDayAvailability(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  timeSlots: string[]
): SlotAvailability[] {
  const blocked = isClinicWideDateBlocked(date, blocks);
  const dayBookings = bookings.filter(
    (booking) =>
      booking.date === date && CALENDAR_BOOKED_STATUSES.includes(booking.status)
  );

  return timeSlots.map((time) => {
    if (blocked) {
      return { time, state: "blocked" as const };
    }

    const booking = dayBookings.find((entry) => entry.time === time);
    if (booking) {
      return { time, state: "booked" as const, booking };
    }

    return { time, state: "open" as const };
  });
}

export function countOpenSlots(availability: SlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "open").length;
}
