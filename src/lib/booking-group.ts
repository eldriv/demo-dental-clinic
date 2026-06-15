import type { Booking, GroupAttendee, StaffCreateBookingInput } from "./bookings";
import { BOOKING_VALIDATION } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import { generateTimeSlots, isAppointmentSlotInPast, isOperatingDay, isValidTimeSlot } from "./clinic-settings";
import { getClinicTodayString } from "./clinic-timezone";
import type { ClinicDentist } from "./dentists";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked } from "./schedule-block-utils";
import {
  holdsDentistSlotForBooking,
  isDentistOnLeave,
} from "./dentist-availability";
import { getBookingsOnDate } from "./bookings-index";
import { parseTime12hToMinutes, getBookingTimeRangeMinutes } from "./booking-time";

export const GROUP_BOOKING_MIN_PARTY = 2;
export const GROUP_BOOKING_PHONE_NOTICE =
  "For group appointments (2 or more patients), please call the clinic to schedule.";

export function formatMinutesToTime12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function isGroupBooking(booking: Pick<Booking, "bookingKind" | "partySize">): boolean {
  return booking.bookingKind === "group" || (booking.partySize ?? 0) >= GROUP_BOOKING_MIN_PARTY;
}

export function getBookingEndTime(booking: Pick<Booking, "time" | "endTime" | "bookingKind">): string {
  if (booking.endTime?.trim()) return booking.endTime.trim();
  const startMinutes = parseTime12hToMinutes(booking.time);
  return formatMinutesToTime12h(startMinutes + 60);
}

export function formatGroupBookingLabel(booking: Pick<Booking, "partySize" | "attendees" | "bookingKind">): string {
  const size =
    booking.partySize ??
    booking.attendees?.length ??
    GROUP_BOOKING_MIN_PARTY;
  return `Group (${size})`;
}

export function formatBookingCalendarLabel(booking: Pick<Booking, "name" | "partySize" | "attendees" | "bookingKind">): string {
  if (isGroupBooking(booking)) return formatGroupBookingLabel(booking);
  return booking.name;
}

export function formatBookingDisplayName(booking: Booking): string {
  if (isGroupBooking(booking)) {
    return `${formatGroupBookingLabel(booking)} · ${booking.name}`;
  }
  return booking.name;
}

export function getAttendeeForEmail(
  booking: Pick<Booking, "attendees" | "email">,
  email: string
): GroupAttendee | undefined {
  const normalized = email.trim().toLowerCase();
  return (booking.attendees ?? []).find(
    (attendee) => attendee.email?.trim().toLowerCase() === normalized
  );
}

export function isOrganizerEmail(
  booking: Pick<Booking, "email">,
  patientEmail: string
): boolean {
  return booking.email.trim().toLowerCase() === patientEmail.trim().toLowerCase();
}

export function getPatientNameOnBooking(
  booking: Booking,
  patientEmail: string
): string {
  if (isOrganizerEmail(booking, patientEmail)) return booking.name;
  return getAttendeeForEmail(booking, patientEmail)?.name ?? booking.name;
}

export function getPatientPhoneOnBooking(
  booking: Booking,
  patientEmail: string
): string {
  if (isOrganizerEmail(booking, patientEmail)) return booking.phone;
  return getAttendeeForEmail(booking, patientEmail)?.phone?.trim() ?? "";
}

export function getPatientServiceOnBooking(
  booking: Booking,
  patientEmail: string
): string {
  const attendee = getAttendeeForEmail(booking, patientEmail);
  if (attendee?.service) {
    return isGroupBooking(booking) ? `${attendee.service} (group)` : attendee.service;
  }
  return formatBookingServiceLabel(booking);
}

export function formatGroupAttendeesList(booking: Pick<Booking, "attendees">): string {
  return (booking.attendees ?? [])
    .map((attendee) => {
      const contact = attendee.email ? ` · ${attendee.email}` : "";
      return `${attendee.name} — ${attendee.service}${contact}`;
    })
    .join("\n");
}

export function formatBookingTimeRange(booking: Pick<Booking, "time" | "endTime" | "bookingKind" | "partySize">): string {
  if (!isGroupBooking(booking)) return booking.time;
  return `${booking.time} – ${getBookingEndTime(booking)}`;
}

export function formatBookingServiceLabel(booking: Booking): string {
  if (!isGroupBooking(booking)) return booking.service;
  const services = [...new Set((booking.attendees ?? []).map((a) => a.service).filter(Boolean))];
  if (services.length === 1) return `${services[0]} (group)`;
  if (services.length > 1) return `Multiple services (group)`;
  return booking.service;
}

export function validateGroupAttendees(attendees: GroupAttendee[] | undefined): string | null {
  if (!attendees || attendees.length < GROUP_BOOKING_MIN_PARTY) {
    return `Add at least ${GROUP_BOOKING_MIN_PARTY} patients for a group appointment.`;
  }

  const seenEmails = new Set<string>();

  for (const [index, attendee] of attendees.entries()) {
    if (!attendee.name?.trim() || attendee.name.trim().length < 2) {
      return `Patient ${index + 1} needs a valid name.`;
    }
    if (!attendee.service?.trim()) {
      return `Select a service for ${attendee.name.trim() || `patient ${index + 1}`}.`;
    }
    const email = attendee.email?.trim().toLowerCase() ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return `Enter a valid email for ${attendee.name.trim() || `patient ${index + 1}`}.`;
    }
    if (seenEmails.has(email)) {
      return `Each patient in a group needs a unique email (${email} is duplicated).`;
    }
    seenEmails.add(email);
    if (attendee.phone?.trim() && attendee.phone.trim().length < BOOKING_VALIDATION.phone.min) {
      return `Enter a valid phone for ${attendee.name.trim()}.`;
    }
  }

  return null;
}

export function validateGroupTimeRange(startTime: string, endTime: string): string | null {
  if (!startTime?.trim() || !endTime?.trim()) {
    return "Select a start and end time for the group block.";
  }

  const startMinutes = parseTime12hToMinutes(startTime);
  const endMinutes = parseTime12hToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    return "End time must be after the start time.";
  }

  return null;
}

export function getSlotsAfterTime(
  settings: ClinicOperatingSettings,
  startTime: string
): string[] {
  const startMinutes = parseTime12hToMinutes(startTime);
  return generateTimeSlots(settings).filter(
    (slot) => parseTime12hToMinutes(slot) > startMinutes
  );
}

export function validateGroupSlotBooking(options: {
  date: string;
  startTime: string;
  endTime: string;
  dentistId: string;
  settings: ClinicOperatingSettings;
  bookings: Booking[];
  blocks: ScheduleBlock[];
  dentists: ClinicDentist[];
  excludeToken?: string;
}): string | null {
  const { date, startTime, endTime, dentistId, settings, bookings, blocks, dentists, excludeToken } =
    options;

  if (date < getClinicTodayString()) {
    return "Please select today or a future date.";
  }

  const rangeError = validateGroupTimeRange(startTime, endTime);
  if (rangeError) return rangeError;

  if (!isOperatingDay(date, settings)) {
    return "The clinic is closed on the selected date. Please choose another day.";
  }

  if (isClinicWideDateBlocked(date, blocks)) {
    return "The clinic is closed on the selected date. Please choose another day.";
  }

  if (!isValidTimeSlot(startTime, settings) || !isValidTimeSlot(endTime, settings)) {
    return "Please select valid appointment times within clinic hours.";
  }

  const dentist = dentists.find((entry) => entry.id === dentistId);
  if (!dentist) return "Please select a valid dentist.";

  if (isDentistOnLeave(date, dentistId, blocks)) {
    return `${dentist.name} is not available on the selected date.`;
  }

  const startMinutes = parseTime12hToMinutes(startTime);
  const endMinutes = parseTime12hToMinutes(endTime);
  const slotsInRange = generateTimeSlots(settings).filter((slot) => {
    const slotMinutes = parseTime12hToMinutes(slot);
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  });

  if (slotsInRange.length === 0) {
    return "The selected time range does not include any bookable slots.";
  }

  if (isAppointmentSlotInPast(date, startTime)) {
    return "Part of this time range has already passed. Choose a later window.";
  }

  const dayBookings = getBookingsOnDate(bookings, date);
  const dentistDayBookings = dayBookings.filter((booking) => {
    if (booking.assignedDentistId === dentistId) return true;
    return booking.preferredDentistId === dentistId;
  });

  for (const booking of dentistDayBookings) {
    if (booking.token === excludeToken) continue;
    if (!holdsDentistSlotForBooking(booking)) continue;
    const { start, end } = getBookingTimeRangeMinutes(booking);
    if (start < endMinutes && end > startMinutes) {
      return "This time range overlaps an existing appointment. Choose another window.";
    }
  }

  return null;
}

export function buildGroupBookingServiceLabel(attendees: GroupAttendee[]): string {
  const services = [...new Set(attendees.map((a) => a.service.trim()).filter(Boolean))];
  if (services.length === 1) return `${services[0]} (group)`;
  return "Group appointment";
}

export function normalizeStaffGroupBookingInput(
  body: StaffCreateBookingInput
): StaffCreateBookingInput | { error: string } {
  if (body.bookingKind !== "group") return body;

  const attendees = (body.attendees ?? []).map((attendee) => ({
    name: attendee.name.trim(),
    service: attendee.service.trim(),
    email: attendee.email.trim().toLowerCase(),
    phone: attendee.phone?.trim() || undefined,
  }));

  const attendeeError = validateGroupAttendees(attendees);
  if (attendeeError) return { error: attendeeError };

  const timeError = validateGroupTimeRange(body.time, body.endTime ?? "");
  if (timeError) return { error: timeError };

  return {
    ...body,
    attendees,
    partySize: attendees.length,
    service: buildGroupBookingServiceLabel(attendees),
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    endTime: body.endTime?.trim(),
  };
}
