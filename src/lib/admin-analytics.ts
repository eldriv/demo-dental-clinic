import type { Booking } from "./bookings";
import { getBookingSource } from "./bookings";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthlyCount {
  label: string;
  year: number;
  month: number;
  count: number;
}

export interface TreatmentRankRow {
  rank: number;
  name: string;
  count: number;
  sharePercent: number;
}

function parseMonthKey(dateString: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})/.exec(dateString);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}

function isNewPatientBooking(booking: Booking): boolean {
  return booking.status !== "cancelled" && booking.status !== "declined";
}

function isBookedTreatment(booking: Booking): boolean {
  return booking.status !== "cancelled" && booking.status !== "declined";
}

export function getLastMonths(count: number, from = new Date()): Array<{ year: number; month: number; label: string }> {
  const result: Array<{ year: number; month: number; label: string }> = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(from.getFullYear(), from.getMonth() - offset, 1);
    result.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: MONTH_LABELS[date.getMonth()],
    });
  }

  return result;
}

/** First-time patients per month (unique email, first booking created in that month). */
export function getNewPatientsByMonth(bookings: Booking[], months = 6): MonthlyCount[] {
  const monthSlots = getLastMonths(months);
  const firstSeen = new Map<string, { year: number; month: number }>();

  for (const booking of bookings) {
    if (!isNewPatientBooking(booking)) continue;

    const email = booking.email.trim().toLowerCase();
    if (!email) continue;

    const created = new Date(booking.createdAt);
    const key = { year: created.getFullYear(), month: created.getMonth() };

    const existing = firstSeen.get(email);
    if (!existing || key.year < existing.year || (key.year === existing.year && key.month < existing.month)) {
      firstSeen.set(email, key);
    }
  }

  const counts = new Map<string, number>();
  for (const slot of firstSeen.values()) {
    const mapKey = `${slot.year}-${slot.month}`;
    counts.set(mapKey, (counts.get(mapKey) ?? 0) + 1);
  }

  return monthSlots.map((slot) => ({
    ...slot,
    count: counts.get(`${slot.year}-${slot.month}`) ?? 0,
  }));
}

/** Cumulative unique patients through each month (smoother growth line). */
export function getCumulativePatientsByMonth(bookings: Booking[], months = 6): MonthlyCount[] {
  const monthly = getNewPatientsByMonth(bookings, months);
  let running = 0;

  return monthly.map((slot) => {
    running += slot.count;
    return { ...slot, count: running };
  });
}

/** Y-axis cap so small clinics don't spike to full chart height. */
export function getPatientChartYMax(values: number[]): number {
  const peak = Math.max(0, ...values);
  if (peak === 0) return 5;
  if (peak <= 5) return 10;
  return Math.ceil(peak * 1.25);
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getTopTreatmentsBooked(
  bookings: Booking[],
  year: number,
  month: number,
  limit = 5
): TreatmentRankRow[] {
  const countByService = new Map<string, number>();

  for (const booking of bookings) {
    if (!isBookedTreatment(booking)) continue;

    const parsed = parseMonthKey(booking.date);
    if (!parsed || parsed.year !== year || parsed.month !== month) continue;

    countByService.set(booking.service, (countByService.get(booking.service) ?? 0) + 1);
  }

  const sorted = [...countByService.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) return [];

  return sorted.slice(0, limit).map(([name, count], index) => ({
    rank: index + 1,
    name,
    count,
    sharePercent: Math.round((count / total) * 100),
  }));
}

export interface OperationalMetrics {
  noShowRate: number;
  avgPendingHours: number;
  webBookings: number;
  staffBookings: number;
  utilizationPercent: number;
  followUpsPending: number;
}

function isCountableVisit(booking: Booking): boolean {
  return (
    booking.status === "confirmed" ||
    booking.status === "rescheduled" ||
    booking.status === "completed" ||
    booking.noShow === true
  );
}

/** Operational KPIs for the last 30 days. */
export function getOperationalMetrics(bookings: Booking[]): OperationalMetrics {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString();

  const recent = bookings.filter((booking) => booking.createdAt >= cutoffIso);
  const visits = recent.filter(isCountableVisit);
  const noShows = visits.filter((booking) => booking.noShow === true).length;
  const pending = recent.filter((booking) => booking.status === "pending");

  let pendingHoursTotal = 0;
  let pendingResolved = 0;
  for (const booking of pending) {
    const hours = (Date.now() - new Date(booking.createdAt).getTime()) / (1000 * 60 * 60);
    pendingHoursTotal += hours;
    pendingResolved += 1;
  }

  const webBookings = recent.filter((booking) => getBookingSource(booking) === "web").length;
  const staffBookings = recent.filter((booking) => getBookingSource(booking) === "staff").length;
  const confirmed = recent.filter(
    (booking) => booking.status === "confirmed" || booking.status === "rescheduled" || booking.status === "completed"
  ).length;

  return {
    noShowRate: visits.length > 0 ? Math.round((noShows / visits.length) * 100) : 0,
    avgPendingHours: pendingResolved > 0 ? Math.round(pendingHoursTotal / pendingResolved) : 0,
    webBookings,
    staffBookings,
    utilizationPercent: recent.length > 0 ? Math.round((confirmed / recent.length) * 100) : 0,
    followUpsPending: bookings.filter((booking) => booking.followUpNeeded && booking.status !== "completed").length,
  };
}
