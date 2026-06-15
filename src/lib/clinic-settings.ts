export interface ClinicOperatingSettings {
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  lunchStart: string | null;
  lunchEnd: string | null;
  /** 0 = Sunday, 1 = Monday, ... 6 = Saturday */
  operatingDays: number[];
  updatedAt: string;
}

export interface ClinicHoursDisplay {
  summary: string;
  schedule: Array<{ days: string; hours: string }>;
  timeSlots: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEFAULT_CLINIC_SETTINGS: ClinicOperatingSettings = {
  openTime: "9:00 AM",
  closeTime: "5:00 PM",
  slotIntervalMinutes: 30,
  lunchStart: "12:00 PM",
  lunchEnd: "1:00 PM",
  operatingDays: [1, 2, 3, 4, 5, 6],
  updatedAt: new Date(0).toISOString(),
};

const APPOINTMENT_DURATION_MINUTES = 60;

export { APPOINTMENT_DURATION_MINUTES };

function parseTime12h(time: string): { hours: number; minutes: number } {
  const [timePart, period] = time.trim().split(/\s+/);
  const [rawHours, rawMinutes] = timePart.split(":").map(Number);
  let hours = rawHours;
  const minutes = rawMinutes ?? 0;

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

function formatTime12h(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

import { getClinicNowMinutes, getClinicTodayString } from "./clinic-timezone";

function toMinutes(time: string): number {
  const { hours, minutes } = parseTime12h(time);
  return hours * 60 + minutes;
}

/** True when the slot start time is already in the past on the same calendar day. */
export function isAppointmentSlotInPast(
  date: string,
  time: string,
  now = new Date()
): boolean {
  const todayString = getClinicTodayString(now);
  if (date < todayString) return true;
  if (date > todayString) return false;

  const slotMinutes = toMinutes(time);
  return slotMinutes <= getClinicNowMinutes(now);
}

export function generateTimeSlots(settings: ClinicOperatingSettings): string[] {
  const open = toMinutes(settings.openTime);
  const close = toMinutes(settings.closeTime);
  const lunchStart = settings.lunchStart ? toMinutes(settings.lunchStart) : null;
  const lunchEnd = settings.lunchEnd ? toMinutes(settings.lunchEnd) : null;
  const slots: string[] = [];

  for (
    let minute = open;
    minute + APPOINTMENT_DURATION_MINUTES <= close;
    minute += settings.slotIntervalMinutes
  ) {
    if (lunchStart !== null && lunchEnd !== null && minute >= lunchStart && minute < lunchEnd) {
      continue;
    }
    slots.push(formatTime12h(minute));
  }

  return slots;
}

export function getDayOfWeekFromDateString(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

export function isOperatingDay(date: string, settings: ClinicOperatingSettings): boolean {
  return settings.operatingDays.includes(getDayOfWeekFromDateString(date));
}

export function isValidTimeSlot(time: string, settings: ClinicOperatingSettings): boolean {
  return generateTimeSlots(settings).includes(time);
}

function formatDayRange(days: number[]): string {
  if (days.length === 0) return "";
  if (days.length === 7) return "Daily";

  const labels = days.map((day) => DAY_NAMES[day].slice(0, 3));
  if (labels.length === 1) return DAY_NAMES[days[0]];

  const weekdays = [1, 2, 3, 4, 5];
  if (days.length === 5 && weekdays.every((day) => days.includes(day))) {
    return "Monday – Friday";
  }

  if (days.length === 6 && weekdays.every((day) => days.includes(day)) && days.includes(6)) {
    return "Monday – Saturday";
  }

  return labels.join(", ");
}

function formatHoursRange(settings: ClinicOperatingSettings): string {
  return `${settings.openTime} – ${settings.closeTime}`;
}

export function buildHoursDisplay(settings: ClinicOperatingSettings): ClinicHoursDisplay {
  const openDays = [...settings.operatingDays].sort((a, b) => a - b);
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((day) => !openDays.includes(day));
  const schedule: Array<{ days: string; hours: string }> = [];

  if (openDays.length > 0) {
    schedule.push({
      days: formatDayRange(openDays),
      hours: formatHoursRange(settings),
    });
  }

  for (const day of closedDays) {
    schedule.push({
      days: DAY_NAMES[day],
      hours: day === 0 ? "By appointment only" : "Closed",
    });
  }

  const summary =
    openDays.length > 0
      ? `${formatDayRange(openDays)} ${settings.openTime.replace(":00", "")}–${settings.closeTime.replace(":00", "")}`
      : "By appointment only";

  return {
    summary,
    schedule,
    timeSlots: generateTimeSlots(settings),
  };
}

export function mergeClinicSettings(
  stored: Partial<ClinicOperatingSettings> | null
): ClinicOperatingSettings {
  if (!stored) return { ...DEFAULT_CLINIC_SETTINGS };

  return {
    ...DEFAULT_CLINIC_SETTINGS,
    ...stored,
    operatingDays: stored.operatingDays?.length
      ? [...stored.operatingDays].sort((a, b) => a - b)
      : DEFAULT_CLINIC_SETTINGS.operatingDays,
    updatedAt: stored.updatedAt ?? DEFAULT_CLINIC_SETTINGS.updatedAt,
  };
}

export const TIME_OPTIONS = (() => {
  const options: string[] = [];
  for (let minute = 6 * 60; minute <= 22 * 60; minute += 30) {
    options.push(formatTime12h(minute));
  }
  return options;
})();

export const DAY_OPTIONS = DAY_NAMES.map((label, value) => ({ label, value }));
