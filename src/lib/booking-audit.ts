import type { Booking, BookingAuditEntry } from "./bookings";
import { updateBooking } from "./bookings-store";

export function appendAuditEntry(
  booking: Booking,
  entry: Omit<BookingAuditEntry, "at"> & { at?: string }
): BookingAuditEntry[] {
  const log = booking.auditLog ?? [];
  return [
    ...log,
    {
      at: entry.at ?? new Date().toISOString(),
      actor: entry.actor,
      action: entry.action,
      detail: entry.detail,
    },
  ];
}

export async function recordBookingAudit(
  token: string,
  booking: Booking,
  entry: Omit<BookingAuditEntry, "at"> & { at?: string }
): Promise<Booking | null> {
  return updateBooking(token, {
    auditLog: appendAuditEntry(booking, entry),
  });
}
