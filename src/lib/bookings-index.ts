import type { Booking } from "./bookings";

/** Bookings on a single date — O(n) scan, no allocations when empty. */
export function getBookingsOnDate(bookings: Booking[], date: string): Booking[] {
  const result: Booking[] = [];
  for (const booking of bookings) {
    if (booking.date === date) result.push(booking);
  }
  return result;
}

export function indexBookingsByDate(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = map.get(booking.date);
    if (list) list.push(booking);
    else map.set(booking.date, [booking]);
  }
  return map;
}

export function filterBookingsInMonth(
  bookings: Booking[],
  year: number,
  month: number
): Booking[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const result: Booking[] = [];
  for (const booking of bookings) {
    if (booking.date.startsWith(prefix)) result.push(booking);
  }
  return result;
}
