import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import { listBookingsForAdmin } from "@/lib/admin-bookings";
import {
  getNoShowAlerts,
  getTodayLateNotices,
  LATE_ARRIVAL_THRESHOLD_MINUTES,
} from "@/lib/appointment-attendance";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const bookings = await listBookingsForAdmin();
  const now = new Date();

  const alerts = getNoShowAlerts(bookings, now).map(({ booking, minutesPastStart, hasLateNotice }) => ({
    token: booking.token,
    name: booking.name,
    phone: booking.phone,
    service: booking.service,
    date: booking.date,
    time: booking.time,
    minutesPastStart,
    hasLateNotice,
    lateNoticeMinutes: booking.lateNoticeMinutes,
    lateNoticeNote: booking.lateNoticeNote,
    dentistName: booking.assignedDentistName ?? booking.preferredDentistName,
  }));

  const lateNotices = getTodayLateNotices(bookings, now).map((booking) => ({
    token: booking.token,
    name: booking.name,
    time: booking.time,
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
