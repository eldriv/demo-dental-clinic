import { NextResponse } from "next/server";
import { getBookingByToken } from "@/lib/bookings-store";
import { approveBooking } from "@/lib/admin-bookings";
import { buildConfirmSuccessPage } from "@/lib/email-templates";
import { getSiteUrlFromRequest } from "@/lib/site-url";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken.trim();
  const siteUrl = getSiteUrlFromRequest(request);
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
    return new NextResponse(buildConfirmSuccessPage(booking, true, siteUrl), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const result = await approveBooking(token, siteUrl, {
    assignedDentistId: booking.preferredDentistId,
    requireDentist: false,
    actor: "email-confirm",
  });
  if (result.error || !result.booking) {
    return new NextResponse(
      `<html><body style="font-family:system-ui;max-width:520px;margin:40px auto;padding:20px;text-align:center;">
        <h1>Confirmation Failed</h1>
        <p>${result.error ?? "Unable to confirm this booking."}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 400 }
    );
  }

  return new NextResponse(buildConfirmSuccessPage(result.booking, false, siteUrl), {
    headers: { "Content-Type": "text/html" },
  });
}
