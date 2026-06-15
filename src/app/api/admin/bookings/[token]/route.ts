import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  approveBooking,
  cancelBookingAdmin,
  completeBooking,
  declineBooking,
  reassignBookingDentist,
  markBookingNoShow,
  updateBookingInternalNotes,
  updateBookingVisitNotes,
  setBookingFollowUp,
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
  const actor = session.name;

  try {
    const body = (await request.json()) as {
      action?: string;
      note?: string;
      assignedDentistId?: string;
      internalNotes?: string;
      visitNotes?: string;
      followUpNeeded?: boolean;
    };
    const action = body.action;

    if (action === "approve") {
      const result = await approveBooking(token, siteUrl, {
        assignedDentistId: body.assignedDentistId,
        requireDentist: true,
        actor,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "decline") {
      const result = await declineBooking(token, siteUrl, body.note, { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "complete") {
      const result = await completeBooking(token, { actor, visitNotes: body.visitNotes });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "cancel") {
      const result = await cancelBookingAdmin(token, siteUrl, { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "confirm-attendance") {
      const { confirmPatientAttendance } = await import("@/lib/admin-bookings");
      const result = await confirmPatientAttendance(token, { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "reassign-dentist") {
      const result = await reassignBookingDentist(token, body.assignedDentistId ?? "", { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "mark-no-show") {
      const result = await markBookingNoShow(token, { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "update-internal-notes") {
      const result = await updateBookingInternalNotes(token, body.internalNotes ?? "", { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "update-visit-notes") {
      const result = await updateBookingVisitNotes(token, body.visitNotes ?? "", { actor });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, booking: result.booking });
    }

    if (action === "set-follow-up") {
      const result = await setBookingFollowUp(token, Boolean(body.followUpNeeded), { actor });
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
