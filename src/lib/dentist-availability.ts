import type { Booking } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import { generateTimeSlots, isOperatingDay, isValidTimeSlot, isAppointmentSlotInPast } from "./clinic-settings";
import type { ClinicDentist } from "./dentists";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked, isDateBlocked } from "./schedule-block-utils";
import { isRescheduledPatient } from "./booking-status";

/** Patient chose any available dentist on the booking form. */
export const ANY_DENTIST_ID = "any";

export function isAnyDentist(dentistId: string | undefined | null): boolean {
  return !dentistId || dentistId === ANY_DENTIST_ID;
}

export function getBookingDentistId(booking: Booking): string | undefined {
  return booking.assignedDentistId ?? booking.preferredDentistId;
}

/** Committed on the dashboard schedule (approved visits). */
export function blocksDentistSchedule(booking: Booking): boolean {
  if (booking.status === "completed") return true;
  if (booking.status === "confirmed") return true;
  if (booking.status === "rescheduled" && !booking.rescheduledByPatient) return true;
  return false;
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
  bookings: Booking[],
  date: string,
  time: string,
  excludeToken?: string
): boolean {
  return bookings.some(
    (booking) =>
      booking.date === date &&
      booking.time === time &&
      booking.token !== excludeToken &&
      holdsDentistSlotForBooking(booking) &&
      isAnyDentist(booking.preferredDentistId) &&
      isAnyDentist(booking.assignedDentistId)
  );
}

export function isSlotTakenForDentist(
  bookings: Booking[],
  date: string,
  time: string,
  dentistId: string,
  excludeToken?: string,
  mode: "booking" | "schedule" = "booking"
): boolean {
  const holds = mode === "booking" ? holdsDentistSlotForBooking : blocksDentistSchedule;

  return bookings.some(
    (booking) =>
      booking.date === date &&
      booking.time === time &&
      booking.token !== excludeToken &&
      holds(booking) &&
      bookingMatchesDentist(booking, dentistId)
  );
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
  if (hasPendingAnyAtTime(bookings, date, time, excludeToken) && mode === "booking") {
    return false;
  }
  return getAvailableDentistsAt(bookings, blocks, date, time, dentists, excludeToken, mode).length > 0;
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
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId: string | undefined,
  excludeToken?: string
): boolean {
  if (isAppointmentSlotInPast(date, time)) return false;

  if (isAnyDentist(dentistId)) {
    return isAnySlotAvailableAt(bookings, blocks, date, time, dentists, excludeToken, "booking");
  }

  if (isDentistOnLeave(date, dentistId!, blocks)) return false;

  return (
    !isSlotTakenForDentist(bookings, date, time, dentistId!, excludeToken, "booking") &&
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

  return baseSlots.map((time) => ({
    time,
    available: isTimeSlotAvailableForDentist(
      date,
      time,
      settings,
      bookings,
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

  const bookingDate = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
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

export type DentistSlotState = "open" | "booked" | "pending" | "blocked";

export interface DentistSlotAvailability {
  time: string;
  state: DentistSlotState;
  booking?: Booking;
}

export function getDentistDayAvailability(
  bookings: Booking[],
  blocks: ScheduleBlock[],
  date: string,
  timeSlots: string[],
  dentistId: string
): DentistSlotAvailability[] {
  const clinicBlocked = isClinicWideDateBlocked(date, blocks);
  const onLeave = isDentistOnLeave(date, dentistId, blocks);

  return timeSlots.map((time) => {
    if (clinicBlocked || onLeave) {
      return { time, state: "blocked" as const };
    }

    const approved = bookings.find(
      (booking) =>
        booking.date === date &&
        booking.time === time &&
        blocksDentistSchedule(booking) &&
        bookingMatchesDentist(booking, dentistId)
    );

    if (approved) {
      return { time, state: "booked" as const, booking: approved };
    }

    const pending = bookings.find(
      (booking) =>
        booking.date === date &&
        booking.time === time &&
        holdsDentistSlotForBooking(booking) &&
        !blocksDentistSchedule(booking) &&
        (bookingMatchesDentist(booking, dentistId) ||
          (isAnyDentist(booking.preferredDentistId) && isAnyDentist(booking.assignedDentistId)))
    );

    if (pending) {
      return { time, state: "pending" as const, booking: pending };
    }

    return { time, state: "open" as const };
  });
}

export function countDentistOpenSlots(availability: DentistSlotAvailability[]): number {
  return availability.filter((slot) => slot.state === "open").length;
}
