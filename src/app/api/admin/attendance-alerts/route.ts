import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import { listBookingsForAdmin } from "@/lib/admin-bookings";
import {
  getNoShowAlerts,
  getTodayLateNotices,
  LATE_ARRIVAL_THRESHOLD_MINUTES,
} from "@/lib/appointment-attendance";
import { formatBookingCalendarLabel, formatBookingServiceLabel, formatBookingTimeRange } from "@/lib/booking-group";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const bookings = await listBookingsForAdmin();
  const now = new Date();

  const alerts = getNoShowAlerts(bookings, now).map(({ booking, minutesPastStart, hasLateNotice }) => ({
    token: booking.token,
    name: formatBookingCalendarLabel(booking),
    phone: booking.phone,
    service: formatBookingServiceLabel(booking),
    date: booking.date,
    time: formatBookingTimeRange(booking),
    minutesPastStart,
    hasLateNotice,
    lateNoticeMinutes: booking.lateNoticeMinutes,
    lateNoticeNote: booking.lateNoticeNote,
    dentistName: booking.assignedDentistName ?? booking.preferredDentistName,
  }));

  const lateNotices = getTodayLateNotices(bookings, now).map((booking) => ({
    token: booking.token,
    name: formatBookingCalendarLabel(booking),
    time: formatBookingTimeRange(booking),
    lateNoticeMinutes: booking.lateNoticeMinutes,
    lateNoticeNote: booking.lateNoticeNote,
    dentistName: booking.assignedDentistName ?? booking.preferredDentistName,
  }));

  return NextResponse.json({
    thresholdMinutes: LATE_ARRIVAL_THRESHOLD_MINUTES,
    alerts,
    lateNotices,
    checkedAt: now.toISOString(),
  });
}
