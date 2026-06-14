import type { Booking } from "@/lib/bookings";
import { getBookingStatusLabel, getBookingStatusStyle } from "@/lib/booking-status";

export function StatusBadge({ booking }: { booking: Booking }) {
  return (
    <span className={`admin-badge ${getBookingStatusStyle(booking)}`}>
      {getBookingStatusLabel(booking)}
    </span>
  );
}

export function formatBookingWhen(booking: Booking): string {
  return `${booking.date} · ${booking.time}`;
}
