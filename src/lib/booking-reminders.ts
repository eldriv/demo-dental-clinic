import type { Booking } from "./bookings";
import { getAllBookings, updateBooking } from "./bookings-store";
import { sendAppointmentReminderEmail } from "./email";
import { parseBookingWallClock } from "./clinic-timezone";

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_2H_MS = 2 * 60 * 60 * 1000;
const REMINDER_24H_WINDOW_MS = 60 * 60 * 1000;
const REMINDER_2H_WINDOW_MS = 30 * 60 * 1000;

function isReminderEligible(booking: Booking): boolean {
  return booking.status === "confirmed" || booking.status === "rescheduled";
}

export interface ReminderRunResult {
  sent24h: number;
  sent2h: number;
  skipped: number;
}

export async function processAppointmentReminders(siteUrl?: string): Promise<ReminderRunResult> {
  const bookings = await getAllBookings();
  const now = Date.now();
  let sent24h = 0;
  let sent2h = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (!isReminderEligible(booking)) {
      skipped += 1;
      continue;
    }

    const start = parseBookingWallClock(booking.date, booking.time);
    if (!start) {
      skipped += 1;
      continue;
    }

    const diff = start.getTime() - now;

    if (!booking.reminder24hSentAt && diff <= REMINDER_24H_MS && diff > REMINDER_24H_MS - REMINDER_24H_WINDOW_MS) {
      const result = await sendAppointmentReminderEmail(booking, "24h", siteUrl);
      if (result.sent) {
        await updateBooking(booking.token, { reminder24hSentAt: new Date().toISOString() });
        sent24h += 1;
      }
      continue;
    }

    if (!booking.reminder2hSentAt && diff <= REMINDER_2H_MS && diff > REMINDER_2H_MS - REMINDER_2H_WINDOW_MS) {
      const result = await sendAppointmentReminderEmail(booking, "2h", siteUrl);
      if (result.sent) {
        await updateBooking(booking.token, { reminder2hSentAt: new Date().toISOString() });
        sent2h += 1;
      }
      continue;
    }

    skipped += 1;
  }

  return { sent24h, sent2h, skipped };
}
