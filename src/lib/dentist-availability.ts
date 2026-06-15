import type { Booking } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import { generateTimeSlots, isOperatingDay, isValidTimeSlot, isAppointmentSlotInPast } from "./clinic-settings";
import { getClinicTodayString } from "./clinic-timezone";
import type { ClinicDentist } from "./dentists";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked, isDateBlocked } from "./schedule-block-utils";
import { isRescheduledPatient } from "./booking-status";
import { getBookingsOnDate } from "./bookings-index";
import {
  getBookingTimeRangeMinutes,
  parseTime12hToMinutes,
  slotOverlapsMinutes,
} from "./booking-time";
import {
  isAppointmentInProgress,
} from "./appointment-attendance";

const SLOT_DURATION_MINUTES = 30;

/** Patient chose any available dentist on the booking form. */
export const ANY_DENTIST_ID = "any";

export function isAnyDentist(dentistId: string | undefined | null): boolean {
  return !dentistId || dentistId === ANY_DENTIST_ID;
}

export function getBookingDentistId(booking: Booking): string | undefined {
  return booking.assignedDentistId ?? booking.preferredDentistId;
}

/** Active visits that occupy the dentist schedule (not completed). */
export function blocksDentistSchedule(booking: Booking): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "rescheduled" && !booking.rescheduledByPatient) return true;
  return false;
}

/** Completed visit at this slot — show on calendar but do not block new bookings. */
export function isCompletedScheduleBooking(booking: Booking): boolean {
  return booking.status === "completed";
}

/** Holds a slot while awaiting approval (public booking guard). */
export function holdsDentistSlotForBooking(booking: Booking): boolean {
  return (
    booking.status === "pending" ||
    booking.status === "confirmed" ||
    (booking.status === "rescheduled" && !booking.rescheduledByPatient) ||
    isRescheduledPatient(booking)
  );
}

export function isDentistOnLeave(
  date: string,
  dentistId: string,
  blocks: ScheduleBlock[]
): boolean {
  return isDateBlocked(date, blocks, dentistId);
}

function bookingMatchesDentist(booking: Booking, dentistId: string): boolean {
  if (booking.assignedDentistId === dentistId) return true;
  if (booking.preferredDentistId === dentistId) return true;
  return false;
}

function hasPendingAnyAtTime(
  dayBookings: Booking[],
  time: string,
  excludeToken?: string
): boolean {
  return dayBookings.some(
    (booking) =>
      booking.time === time &&
      booking.token !== excludeToken &&
      holdsDentistSlotForBooking(booking) &&
      isAnyDentist(booking.preferredDentistId) &&
      isAnyDentist(booking.assignedDentistId)
  );
}

function slotTakenOnDay(
  dayBookings: Booking[],
  time: string,
  dentistId: string,
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): boolean {
  const slotStartMin = parseTime12hToMinutes(time);

  for (const booking of dayBookings) {
    if (booking.token === excludeToken) continue;
    if (!bookingMatchesDentist(booking, dentistId)) continue;

    if (mode === "schedule") {
      if (booking.time === time && blocksDentistSchedule(booking)) return true;
      continue;
    }

    if (!holdsDentistSlotForBooking(booking)) continue;

    const { start, end } = getBookingTimeRangeMinutes(booking);
    if (slotOverlapsMinutes(slotStartMin, SLOT_DURATION_MINUTES, start, end)) return true;
  }

  return false;
}

export function isSlotTakenForDentist(
  bookings: Booking[],
  date: string,
  time: string,
  dentistId: string,
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): boolean {
  return slotTakenOnDay(getBookingsOnDate(bookings, date), time, dentistId, excludeToken, mode);
}

export function isDentistAvailableAt(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  time: string,
  dentistId: string,
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): boolean {
  if (isDentistOnLeave(date, dentistId, blocks)) return false;
  if (isSlotTakenForDentist(bookings, date, time, dentistId, excludeToken, mode)) {
    return false;
  }
  return true;
}

export function getAvailableDentistsAt(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  time: string,
  dentists: ClinicDentist[],
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): ClinicDentist[] {
  return dentists.filter((dentist) =>
    isDentistAvailableAt(bookings, blocks, date, time, dentist.id, excludeToken, mode)
  );
}

export function isAnySlotAvailableAt(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  time: string,
  dentists: ClinicDentist[],
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): boolean {
  const dayBookings = getBookingsOnDate(bookings, date);
  if (hasPendingAnyAtTime(dayBookings, time, excludeToken) && mode === "booking") {
    return false;
  }
  return dentists.some((dentist) =>
    isDentistAvailableAt(bookings, blocks, date, time, dentist.id, excludeToken, mode)
  );
}

export function getAvailableTimeSlotsForDentist(
  date: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId: string | undefined,
  excludeToken?: string
): string[] {
  return getTimeSlotOptionsForDentist(
    date,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId,
    excludeToken
  )
    .filter((slot) => slot.available)
    .map((slot) => slot.time);
}

export interface TimeSlotOption {
  time: string;
  available: boolean;
}

function isTimeSlotAvailableForDentist(
  date: string,
  time: string,
  settings: ClinicOperatingSettings,
  dayBookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId: string | undefined,
  excludeToken?: string
): boolean {
  if (isAppointmentSlotInPast(date, time)) return false;

  if (isAnyDentist(dentistId)) {
    if (hasPendingAnyAtTime(dayBookings, time, excludeToken)) return false;
    return dentists.some(
      (dentist) =>
        !isDentistOnLeave(date, dentist.id, blocks) &&
        !slotTakenOnDay(dayBookings, time, dentist.id, excludeToken, "booking") &&
        isValidTimeSlot(time, settings)
    );
  }

  if (isDentistOnLeave(date, dentistId!, blocks)) return false;

  return (
    !slotTakenOnDay(dayBookings, time, dentistId!, excludeToken, "booking") &&
    isValidTimeSlot(time, settings)
  );
}

export function getTimeSlotOptionsForDentist(
  date: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId: string | undefined,
  excludeToken?: string
): TimeSlotOption[] {
  if (!isOperatingDay(date, settings)) return [];
  if (isClinicWideDateBlocked(date, blocks)) return [];

  const baseSlots = generateTimeSlots(settings);
  const dayBookings = getBookingsOnDate(bookings, date);

  return baseSlots.map((time) => ({
    time,
    available: isTimeSlotAvailableForDentist(
      date,
      time,
      settings,
      dayBookings,
      blocks,
      dentists,
      dentistId,
      excludeToken
    ),
  }));
}

export function validateDentistBooking(options: {
  date: string;
  time: string;
  dentistId: string | undefined;
  settings: ClinicOperatingSettings;
  bookings: Booking[];
  blocks: ScheduleBlock[];
  dentists: ClinicDentist[];
  excludeToken?: string;
}): string | null {
  const { date, time, dentistId, settings, bookings, blocks, dentists, excludeToken } = options;

  if (date < getClinicTodayString()) {
    return "Please select today or a future date.";
  }

  if (isAppointmentSlotInPast(date, time)) {
    return "This time slot has already passed. Please choose another time.";
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

  if (dentists.length === 0) {
    return "Online booking is temporarily unavailable. Please call the clinic.";
  }

  if (isAnyDentist(dentistId)) {
    if (!isAnySlotAvailableAt(bookings, blocks, date, time, dentists, excludeToken, "booking")) {
      return "This time slot is no longer available. Please choose another time.";
    }
    return null;
  }

  const dentist = dentists.find((entry) => entry.id === dentistId);
  if (!dentist) {
    return "Please select a valid dentist.";
  }

  if (isDentistOnLeave(date, dentistId!, blocks)) {
    return `${dentist.name} is not available on the selected date. Please choose another day or dentist.`;
  }

  if (isSlotTakenForDentist(bookings, date, time, dentistId!, excludeToken, "booking")) {
    return "This time slot is no longer available. Please choose another time.";
  }

  return null;
}

export type DentistSlotState =
  | "open"
  | "booked"
  | "pending"
  | "blocked"
  | "past"
  | "in-operation"
  | "completed";

export interface DentistSlotAvailability {
  time: string;
  state: DentistSlotState;
  booking?: Booking;
}

function toTodayString(from = new Date()): string {
  return getClinicTodayString(from);
}

function findOverlappingBooking(
  entries: Array<{ booking: Booking; start: number; end: number }>,
  slotStartMin: number,
  predicate: (booking: Booking) => boolean
): Booking | undefined {
  for (const entry of entries) {
    if (!predicate(entry.booking)) continue;
    if (slotOverlapsMinutes(slotStartMin, SLOT_DURATION_MINUTES, entry.start, entry.end)) {
      return entry.booking;
    }
  }
  return undefined;
}

export function getDentistDayAvailability(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  timeSlots: string[],
  dentistId: string,
  now = new Date()
): DentistSlotAvailability[] {
  const clinicBlocked = isClinicWideDateBlocked(date, blocks);
  const onLeave = isDentistOnLeave(date, dentistId, blocks);
  const isPastDay = date < toTodayString(now);

  const dayBookings = getBookingsOnDate(bookings, date);
  const dentistEntries = dayBookings
    .filter((booking) => bookingMatchesDentist(booking, dentistId))
    .map((booking) => ({
      booking,
      ...getBookingTimeRangeMinutes(booking),
    }));

  const pendingAnyEntries = dayBookings
    .filter(
      (booking) =>
        holdsDentistSlotForBooking(booking) &&
        !blocksDentistSchedule(booking) &&
        isAnyDentist(booking.preferredDentistId) &&
        isAnyDentist(booking.assignedDentistId)
    )
    .map((booking) => ({
      booking,
      ...getBookingTimeRangeMinutes(booking),
    }));

  return timeSlots.map((time) => {
    if (clinicBlocked || onLeave) {
      return { time, state: "blocked" as const };
    }

    const slotStartMin = parseTime12hToMinutes(time);

    const completedBooking = findOverlappingBooking(
      dentistEntries,
      slotStartMin,
      isCompletedScheduleBooking
    );
    if (completedBooking) {
      return { time, state: "completed" as const, booking: completedBooking };
    }

    const approved = findOverlappingBooking(dentistEntries, slotStartMin, blocksDentistSchedule);
    if (approved) {
      if (isAppointmentInProgress(approved, now)) {
        return { time, state: "in-operation" as const, booking: approved };
      }
      return { time, state: "booked" as const, booking: approved };
    }

    const pending =
      findOverlappingBooking(
        dentistEntries,
        slotStartMin,
        (booking) => holdsDentistSlotForBooking(booking) && !blocksDentistSchedule(booking)
      ) ??
      findOverlappingBooking(pendingAnyEntries, slotStartMin, () => true);
    if (pending) {
      if (!isPastDay && isAppointmentSlotInPast(date, time, now)) {
        return { time, state: "past" as const, booking: pending };
      }
      return { time, state: "pending" as const, booking: pending };
    }

    if (isPastDay || isAppointmentSlotInPast(date, time, now)) {
      return { time, state: "past" as const };
    }

    return { time, state: "open" as const };
  });
}

export function countDentistOpenSlots(availability: DentistSlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "open").length;
}
