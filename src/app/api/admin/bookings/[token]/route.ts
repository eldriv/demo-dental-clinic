import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  approveBooking,
  cancelBookingAdmin,
  completeBooking,
  declineBooking,
} from "@/lib/admin-bookings";
import { getSiteUrlFromRequest } from "@/lib/site-url";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const { token: rawToken } = await params;
  const token = rawToken.trim();
  const siteUrl = getSiteUrlFromRequest(request);

  try {
    const body = (await request.json()) as {
      action?: string;
      note?: string;
      assignedDentistId?: string;
    };
    const action = body.action;

    if (action === "approve") {
      const result = await approveBooking(token, siteUrl, {
        assignedDentistId: body.assignedDentistId,
        requireDentist: true,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "decline") {
      const result = await declineBooking(token, siteUrl, body.note);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "complete") {
      const result = await completeBooking(token);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "cancel") {
      const result = await cancelBookingAdmin(token, siteUrl);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
