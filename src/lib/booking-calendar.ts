import type { Booking } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import type { ClinicDentist } from "./dentists";
import type { ScheduleBlock } from "./schedule-block-utils";
import { getClinicTodayString } from "./clinic-timezone";
import { filterBookingsInMonth } from "./bookings-index";
import { getTimeSlotOptionsForDentist } from "./dentist-availability";
import { isOperatingDayClosed } from "./booking-availability";

export type BookingDayStatus = "past" | "closed" | "full" | "available";

export interface BookingDayAvailability {
  date: string;
  status: BookingDayStatus;
  openSlots: number;
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMinBookableDateString(now = new Date()): string {
  return getClinicTodayString(now);
}

export function getDayBookingStatus(
  date: string,
  minBookableDate: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId?: string,
  excludeToken?: string
): BookingDayAvailability {
  if (date < minBookableDate) {
    return { date, status: "past", openSlots: 0 };
  }

  if (isOperatingDayClosed(date, settings, blocks)) {
    return { date, status: "closed", openSlots: 0 };
  }

  const slots = getTimeSlotOptionsForDentist(
    date,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId,
    excludeToken
  );

  const openSlots = slots.filter((slot) => slot.available).length;

  if (slots.length === 0 || openSlots === 0) {
    return { date, status: "full", openSlots: 0 };
  }

  return { date, status: "available", openSlots };
}

export function getMonthBookingAvailability(
  year: number,
  month: number,
  minBookableDate: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId?: string,
  excludeToken?: string
): BookingDayAvailability[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthBookings = filterBookingsInMonth(bookings, year, month);
  const results: BookingDayAvailability[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = toDateString(new Date(year, month, day));
    results.push(
      getDayBookingStatus(
        date,
        minBookableDate,
        settings,
        monthBookings,
        blocks,
        dentists,
        dentistId,
        excludeToken
      )
    );
  }

  return results;
}

export function formatBookingMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export function formatBookingWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" }
  );

  return `${startLabel} – ${endLabel}, ${weekEnd.getFullYear()}`;
}

export function getMonthsForWeek(weekStart: Date): Array<{ year: number; month: number }> {
  const months = new Map<string, { year: number; month: number }>();

  for (const date of getWeekDates(weekStart)) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months.set(key, { year: date.getFullYear(), month: date.getMonth() });
  }

  return Array.from(months.values());
}

export function getBookingMonthGrid(year: number, month: number): Array<Date | null> {
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
