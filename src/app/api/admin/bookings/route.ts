import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  filterTodayBookings,
  listBookingsForAdmin,
  createStaffBooking,
} from "@/lib/admin-bookings";
import { canCreateStaffBookings } from "@/content/admin";
import { getSiteUrlFromRequest } from "@/lib/site-url";
import type { StaffCreateBookingInput } from "@/lib/bookings";
import { needsStaffApproval } from "@/lib/booking-status";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const bookings = await listBookingsForAdmin();
  const today = filterTodayBookings(bookings);
  const pending = bookings.filter((booking) => needsStaffApproval(booking));

  return NextResponse.json({
    user: session,
    stats: {
      today: today.length,
      pending: pending.length,
      total: bookings.length,
    },
    today,
    pending,
    bookings,
  });
}

export async function POST(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  if (!canCreateStaffBookings(session.role)) {
    return NextResponse.json({ error: "Not allowed to create bookings." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as StaffCreateBookingInput;
    const siteUrl = getSiteUrlFromRequest(request);
    const result = await createStaffBooking(body, siteUrl, { actor: session.name });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, booking: result.booking });
  } catch {
    return NextResponse.json({ error: "Failed to create booking." }, { status: 500 });
  }
}
