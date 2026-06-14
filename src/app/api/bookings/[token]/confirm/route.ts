import { NextResponse } from "next/server";
import { getBookingByToken, updateBooking } from "@/lib/bookings-store";
import { sendBookingApprovedEmail } from "@/lib/email";
import { createCalendarEvent } from "@/lib/calendar";
import { buildConfirmSuccessPage } from "@/lib/email-templates";
import { site } from "@/content";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const booking = await getBookingByToken(token);

  if (!booking) {
    return new NextResponse(
      `<html><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:20px;text-align:center;">
        <h1>Booking Not Found</h1>
        <p>This confirmation link is invalid or has expired.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 404 }
    );
  }

  if (booking.status === "cancelled") {
    return new NextResponse(
      `<html><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:20px;text-align:center;">
        <h1>Cannot Confirm</h1>
        <p>This appointment was cancelled and can no longer be confirmed.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 400 }
    );
  }

  if (booking.status === "confirmed" || booking.status === "rescheduled") {
    return new NextResponse(buildConfirmSuccessPage(booking, true), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const calendarResult = await createCalendarEvent(booking);
  const updates: Parameters<typeof updateBooking>[1] = {
    status: "confirmed",
  };
  if (calendarResult.eventId) {
    updates.calendarEventId = calendarResult.eventId;
  }

  const updated = await updateBooking(token, updates);
  if (!updated) {
    return new NextResponse(
      `<html><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:20px;text-align:center;">
        <h1>Confirmation Failed</h1>
        <p>Unable to confirm this booking. Please try again or contact ${site.contact.phones[0]}.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }

  await sendBookingApprovedEmail(updated);

  return new NextResponse(buildConfirmSuccessPage(updated), {
    headers: { "Content-Type": "text/html" },
  });
}
