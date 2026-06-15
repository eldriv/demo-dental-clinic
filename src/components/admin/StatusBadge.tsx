import type { Booking } from "@/lib/bookings";
import { getBookingStatusLabel, getBookingStatusStyle } from "@/lib/booking-status";

export function StatusBadge({
  booking,
  compact = false,
}: {
  booking: Booking;
  compact?: boolean;
}) {
  return (
    <span
      className={`admin-badge ${compact ? "admin-badge-compact" : ""} ${getBookingStatusStyle(booking)}`}
    >
      {getBookingStatusLabel(booking)}
    </span>
  );
}

export function formatBookingWhen(booking: Booking): string {
  return `${booking.date} · ${booking.time}`;
}
