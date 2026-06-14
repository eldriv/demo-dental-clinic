import { NextResponse } from "next/server";
import { getBookingByToken, updateBooking } from "@/lib/bookings-store";
import {
  sendCancellationEmails,
  sendRescheduleEmails,
} from "@/lib/email";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/calendar";
import { getSiteUrlFromRequest } from "@/lib/site-url";
import { site } from "@/content";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getAllBookings } from "@/lib/bookings-store";
import { validateSlotBooking } from "@/lib/booking-availability";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken.trim();
  const booking = await getBookingByToken(token);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token: rawToken } = await params;
  const token = rawToken.trim();
  const siteUrl = getSiteUrlFromRequest(request);

  try {
    const body = await request.json();
    const booking = await getBookingByToken(token);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "This appointment has already been cancelled." },
        { status: 400 }
      );
    }

    if (body.action === "cancel") {
      const updated = await updateBooking(token, { status: "cancelled" });
      if (!updated) {
        return NextResponse.json({ error: "Failed to cancel." }, { status: 500 });
      }

      if (updated.calendarEventId) {
        await deleteCalendarEvent(updated.calendarEventId);
      }

      await sendCancellationEmails(updated, siteUrl);

      return NextResponse.json({
        success: true,
        message: "Appointment cancelled.",
        booking: updated,
      });
    }

    if (body.action === "reschedule") {
      const { date, time } = body;

      if (!date || !time) {
        return NextResponse.json(
          { error: "Date and time are required." },
          { status: 400 }
        );
      }

      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) {
        return NextResponse.json(
          { error: "Please select a future date." },
          { status: 400 }
        );
      }

      const [settings, bookings, blocks] = await Promise.all([
        getClinicSettings(),
        getAllBookings(),
        getAllScheduleBlocks(),
      ]);

      const slotError = validateSlotBooking({
        date,
        time,
        settings,
        bookings,
        blocks,
        excludeToken: token,
      });

      if (slotError) {
        return NextResponse.json({ error: slotError }, { status: 400 });
      }

      const updated = await updateBooking(token, {
        date,
        time,
        status: "rescheduled",
        rescheduledByPatient: true,
      });

      if (!updated) {
        return NextResponse.json({ error: "Failed to reschedule." }, { status: 500 });
      }

      await updateCalendarEvent(updated);
      await sendRescheduleEmails(updated, siteUrl);

      return NextResponse.json({
        success: true,
        message: "Appointment rescheduled.",
        booking: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    console.error("Booking management error:", err);
    return NextResponse.json(
      {
        error: `Unable to update booking. Please call us at ${site.contact.phones[0]}.`,
      },
      { status: 500 }
    );
  }
}
