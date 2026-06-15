export function getClinicTimezone(): string {
  return process.env.CLINIC_TIMEZONE?.trim() || "Asia/Manila";
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
