import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  filterTodayBookings,
  listBookingsForAdmin,
} from "@/lib/admin-bookings";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const bookings = await listBookingsForAdmin();
  const today = filterTodayBookings(bookings);
  const pending = bookings.filter((booking) => booking.status === "pending");

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
