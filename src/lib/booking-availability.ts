import type { Booking } from "./bookings";
import type { ClinicOperatingSettings } from "./clinic-settings";
import { isOperatingDay } from "./clinic-settings";
import type { ClinicDentist } from "./dentists";
import type { ScheduleBlock } from "./schedule-block-utils";
import { isClinicWideDateBlocked } from "./schedule-block-utils";
import {
  ANY_DENTIST_ID,
  getAvailableTimeSlotsForDentist,
  getTimeSlotOptionsForDentist,
  holdsDentistSlotForBooking,
  validateDentistBooking,
  type TimeSlotOption,
} from "./dentist-availability";

export type { TimeSlotOption } from "./dentist-availability";

export { ANY_DENTIST_ID, holdsDentistSlotForBooking as holdsSlot } from "./dentist-availability";

export function getTimeSlotOptions(
  date: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId?: string,
  excludeToken?: string
): TimeSlotOption[] {
  return getTimeSlotOptionsForDentist(
    date,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId,
    excludeToken
  );
}

export function getAvailableTimeSlots(
  date: string,
  settings: ClinicOperatingSettings,
  bookings: Booking[],
  blocks: ScheduleBlock[],
  dentists: ClinicDentist[],
  dentistId?: string,
  excludeToken?: string
): string[] {
  return getAvailableTimeSlotsForDentist(
    date,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId,
    excludeToken
  );
}

export function validateSlotBooking(options: {
  date: string;
  time: string;
  settings: ClinicOperatingSettings;
  bookings: Booking[];
  blocks: ScheduleBlock[];
  dentists: ClinicDentist[];
  dentistId?: string;
  excludeToken?: string;
}): string | null {
  return validateDentistBooking({
    ...options,
    dentistId: options.dentistId ?? ANY_DENTIST_ID,
  });
}

export function isOperatingDayClosed(
  date: string,
  settings: ClinicOperatingSettings,
  blocks: ScheduleBlock[]
): boolean {
  return !isOperatingDay(date, settings) || isClinicWideDateBlocked(date, blocks);
}
