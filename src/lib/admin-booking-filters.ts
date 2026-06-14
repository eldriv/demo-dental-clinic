import type { Booking } from "@/lib/bookings";

export function sortBookingsByDateTime(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return aKey.localeCompare(bKey);
  });
}

export function getTodayDateString(from = new Date()): string {
  const year = from.getFullYear();
  const month = String(from.getMonth() + 1).padStart(2, "0");
  const day = String(from.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateStringFromIso(iso: string): string {
  return getTodayDateString(new Date(iso));
}

export function getCompletionDateString(booking: Booking): string | null {
  if (booking.status !== "completed") return null;
  return getLocalDateStringFromIso(booking.completedAt ?? booking.updatedAt);
}

/** Scheduled for today, or completed today (even if booked on another day). */
export function isTodayVisit(booking: Booking, today = getTodayDateString()): boolean {
  if (booking.status === "cancelled" || booking.status === "declined") return false;
  if (booking.date === today) return true;
  return getCompletionDateString(booking) === today;
}

export function filterTodayBookings(bookings: Booking[]): Booking[] {
  const today = getTodayDateString();
  return sortBookingsByDateTime(
    bookings.filter((booking) => isTodayVisit(booking, today))
  );
}
