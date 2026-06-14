import { NextResponse } from "next/server";
import { getAllBookings } from "@/lib/bookings-store";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getAllDentists } from "@/lib/dentists-store";
import { ANY_DENTIST_ID } from "@/lib/booking-availability";
import {
  getMinBookableDateString,
  getMonthBookingAvailability,
} from "@/lib/booking-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const dentistId = searchParams.get("dentistId")?.trim() || ANY_DENTIST_ID;
  const excludeToken = searchParams.get("excludeToken")?.trim() || undefined;

  const year = yearParam ? Number(yearParam) : NaN;
  const month = monthParam ? Number(monthParam) : NaN;

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Valid year and month (0–11) are required." }, { status: 400 });
  }

  const [settings, bookings, blocks, dentists] = await Promise.all([
    getClinicSettings(),
    getAllBookings(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const minBookableDate = getMinBookableDateString();
  const days = getMonthBookingAvailability(
    year,
    month,
    minBookableDate,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId,
    excludeToken
  );

  return NextResponse.json({
    year,
    month,
    dentistId,
    minBookableDate,
    days,
  });
}
