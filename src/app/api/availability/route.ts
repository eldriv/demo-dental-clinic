import { NextResponse } from "next/server";
import { getAllBookings } from "@/lib/bookings-store";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getAllDentists } from "@/lib/dentists-store";
import {
  ANY_DENTIST_ID,
  getAvailableTimeSlots,
  getTimeSlotOptions,
  isOperatingDayClosed,
} from "@/lib/booking-availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim();
  const excludeToken = searchParams.get("excludeToken")?.trim() || undefined;
  const dentistId = searchParams.get("dentistId")?.trim() || ANY_DENTIST_ID;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }

  const [settings, bookings, blocks, dentists] = await Promise.all([
    getClinicSettings(),
    getAllBookings(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const closed = isOperatingDayClosed(date, settings, blocks);
  const slots = closed
    ? []
    : getTimeSlotOptions(date, settings, bookings, blocks, dentists, dentistId, excludeToken);
  const timeSlots = slots.filter((slot) => slot.available).map((slot) => slot.time);

  return NextResponse.json({
    date,
    closed,
    dentistId,
    slots,
    timeSlots,
  });
}
