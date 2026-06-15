export function getClinicTimezone(): string {
  return process.env.CLINIC_TIMEZONE?.trim() || "Asia/Manila";
}

interface ClinicDateParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

/** Wall-clock parts for the clinic timezone (not the server/host timezone). */
export function getClinicDateParts(now = new Date()): ClinicDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: getClinicTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  let hours = Number.parseInt(get("hour"), 10);
  if (hours === 24) hours = 0;

  return {
    year: Number.parseInt(get("year"), 10),
    month: Number.parseInt(get("month"), 10),
    day: Number.parseInt(get("day"), 10),
    hours,
    minutes: Number.parseInt(get("minute"), 10),
  };
}

/** YYYY-MM-DD for today in the clinic timezone. */
export function getClinicTodayString(now = new Date()): string {
  const { year, month, day } = getClinicDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Minutes since midnight in the clinic timezone. */
export function getClinicNowMinutes(now = new Date()): number {
  const { hours, minutes } = getClinicDateParts(now);
  return hours * 60 + minutes;
}

/** Parse booking wall-clock date/time as local Date (clinic server context). */
export function parseBookingWallClock(date: string, time: string): Date | null {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
