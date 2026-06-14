import { NextResponse } from "next/server";
import { getAllBookings } from "@/lib/bookings-store";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getAvailableTimeSlots } from "@/lib/booking-availability";
import { isClinicWideDateBlocked } from "@/lib/schedule-block-utils";
import { isOperatingDay } from "@/lib/clinic-settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim();
  const excludeToken = searchParams.get("excludeToken")?.trim() || undefined;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  const [settings, bookings, blocks] = await Promise.all([
    getClinicSettings(),
    getAllBookings(),
    getAllScheduleBlocks(),
  ]);

  const closed = !isOperatingDay(date, settings) || isClinicWideDateBlocked(date, blocks);
  const timeSlots = closed
    ? []
    : getAvailableTimeSlots(date, settings, bookings, blocks, excludeToken);

  return NextResponse.json({
    date,
    closed,
    timeSlots,
  });
}
