import type { Booking } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import { generateTimeSlots, isOperatingDay, isValidTimeSlot } from "./clinic-settings";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked } from "./schedule-block-utils";

export const SLOT_HOLDING_STATUSES: Booking["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
];

export function holdsSlot(booking: Booking): boolean {
  return SLOT_HOLDING_STATUSES.includes(booking.status);
}

export function isSlotTaken(
  bookings: Booking[],
  date: string,
  time: string,
  excludeToken?: string
): boolean {
  return bookings.some(
    (booking) =>
      booking.date === date &&
      booking.time === time &&
      holdsSlot(booking) &&
      booking.token !== excludeToken
  );
}

export function getAvailableTimeSlots(
  date: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  excludeToken?: string
): string[] {
  if (!isOperatingDay(date, settings)) return [];
  if (isClinicWideDateBlocked(date, blocks)) return [];

  return generateTimeSlots(settings).filter(
    (time) => !isSlotTaken(bookings, date, time, excludeToken)
  );
}

export function validateSlotBooking(options: {
  date: string;
  time: string;
  settings: ClinicOperatingSettings;
  bookings: Booking[];
  blocks: ScheduleBlock[];
  excludeToken?: string;
}): string | null {
  const { date, time, settings, bookings, blocks, excludeToken } = options;

  const bookingDate = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return "Please select a future date.";
  }

  if (!isOperatingDay(date, settings)) {
    return "The clinic is closed on the selected date. Please choose another day.";
  }

  if (isClinicWideDateBlocked(date, blocks)) {
    return "The clinic is closed on the selected date. Please choose another day.";
  }

  if (!isValidTimeSlot(time, settings)) {
    return "Please select a valid appointment time.";
  }

  if (isSlotTaken(bookings, date, time, excludeToken)) {
    return "This time slot is no longer available. Please choose another time.";
  }

  return null;
}
