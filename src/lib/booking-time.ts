import type { Booking } from "./bookings";
import { getBookingEndTime } from "./booking-group";

/** Minutes from midnight for a 12-hour clock string (e.g. "9:30 AM"). */
export function parseTime12hToMinutes(time: string): number {
  const [timePart, period] = time.trim().split(/\s+/);
  const [rawHours, rawMinutes] = timePart.split(":").map(Number);
  let hours = rawHours;
  const minutes = rawMinutes ?? 0;

  if (period?.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period?.toUpperCase() === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function getBookingTimeRangeMinutes(
  booking: Pick<Booking, "time" | "endTime" | "bookingKind" | "partySize">
): { start: number; end: number } {
  return {
    start: parseTime12hToMinutes(booking.time),
    end: parseTime12hToMinutes(getBookingEndTime(booking)),
  };
}

export function slotOverlapsMinutes(
  slotStartMin: number,
  slotDurationMin: number,
  apptStartMin: number,
  apptEndMin: number
): boolean {
  const slotEndMin = slotStartMin + slotDurationMin;
  return slotStartMin < apptEndMin && slotEndMin > apptStartMin;
}
