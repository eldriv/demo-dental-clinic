import type { Booking } from "./bookings";
import { getBookingEndTime } from "./booking-group";
import { isRescheduledPatient } from "./booking-status";
import { APPOINTMENT_DURATION_MINUTES } from "./clinic-settings";
import {
  getBookingTimeRangeMinutes,
  parseTime12hToMinutes,
  slotOverlapsMinutes,
} from "./booking-time";

/** Minutes after scheduled start before reception gets a no-show alert. */
export const LATE_ARRIVAL_THRESHOLD_MINUTES = 30;

export { APPOINTMENT_DURATION_MINUTES };

export interface AttendanceAlert {
  booking: Booking;
  minutesPastStart: number;
  hasLateNotice: boolean;
}

function parseTime12h(time: string): { hours: number; minutes: number } {
  const [timePart, period] = time.trim().split(/\s+/);
  const [rawHours, rawMinutes] = timePart.split(":").map(Number);
  let hours = rawHours;
  const minutes = rawMinutes ?? 0;

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function getAppointmentStart(date: string, time: string): Date {
  const { hours, minutes } = parseTime12h(time);
  const start = new Date(`${date}T12:00:00`);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

export function getAppointmentEnd(date: string, time: string, endTime?: string): Date {
  const endTimeStr =
    endTime ?? formatMinutesToTime12h(parseTime12hToMinutesLocal(time) + APPOINTMENT_DURATION_MINUTES);
  const { hours, minutes } = parseTime12h(endTimeStr);
  const end = new Date(`${date}T12:00:00`);
  end.setHours(hours, minutes, 0, 0);
  return end;
}

export function getAppointmentEndForBooking(
  booking: Pick<Booking, "date" | "time" | "endTime" | "bookingKind" | "partySize">
): Date {
  return getAppointmentEnd(booking.date, booking.time, getBookingEndTime(booking));
}

function parseTime12hToMinutesLocal(time: string): number {
  const { hours, minutes } = parseTime12h(time);
  return hours * 60 + minutes;
}

function formatMinutesToTime12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Confirmed visit currently in the chair (within scheduled duration). */
export function isAppointmentInProgress(booking: Booking, now = new Date()): boolean {
  if (!isActiveAppointment(booking)) return false;
  if (booking.date !== toDateString(now)) return false;

  const start = getAppointmentStart(booking.date, booking.time);
  const end = getAppointmentEndForBooking(booking);
  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

export function slotOverlapsAppointment(
  date: string,
  slotTime: string,
  booking: Booking,
  slotDurationMinutes = 30
): boolean {
  if (booking.date !== date) return false;

  const slotStartMin = parseTime12hToMinutes(slotTime);
  const { start, end } = getBookingTimeRangeMinutes(booking);
  return slotOverlapsMinutes(slotStartMin, slotDurationMinutes, start, end);
}

export function isActiveAppointment(booking: Booking): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "rescheduled" && !booking.rescheduledByPatient) return true;
  return false;
}

export function canReportLateArrival(booking: Booking, now = new Date()): boolean {
  if (!isActiveAppointment(booking)) return false;
  return booking.date === toDateString(now);
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function needsNoShowAlert(booking: Booking, now = new Date()): boolean {
  if (!isActiveAppointment(booking)) return false;
  if (booking.attendanceConfirmed) return false;
  if (booking.date !== toDateString(now)) return false;

  const start = getAppointmentStart(booking.date, booking.time);
  const thresholdMs = LATE_ARRIVAL_THRESHOLD_MINUTES * 60_000;
  return now.getTime() >= start.getTime() + thresholdMs;
}

export function getNoShowAlerts(bookings: Booking[], now = new Date()): AttendanceAlert[] {
  return bookings
    .filter((booking) => needsNoShowAlert(booking, now))
    .map((booking) => {
      const start = getAppointmentStart(booking.date, booking.time);
      const minutesPastStart = Math.floor((now.getTime() - start.getTime()) / 60_000);
      return {
        booking,
        minutesPastStart,
        hasLateNotice: Boolean(booking.lateNoticeAt),
      };
    })
    .sort((a, b) => a.booking.time.localeCompare(b.booking.time));
}

export function getTodayLateNotices(bookings: Booking[], now = new Date()): Booking[] {
  const today = toDateString(now);
  return bookings
    .filter(
      (booking) =>
        booking.date === today &&
        Boolean(booking.lateNoticeAt) &&
        isActiveAppointment(booking)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function formatLateNoticeSummary(booking: Booking): string {
  if (!booking.lateNoticeAt) return "";
  const parts: string[] = ["Running late"];
  if (typeof booking.lateNoticeMinutes === "number" && booking.lateNoticeMinutes > 0) {
    parts.push(`~${booking.lateNoticeMinutes} min`);
  }
  if (booking.lateNoticeNote?.trim()) {
    parts.push(booking.lateNoticeNote.trim());
  }
  return parts.join(" · ");
}
