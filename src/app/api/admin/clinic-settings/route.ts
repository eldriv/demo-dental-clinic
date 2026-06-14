import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  getClinicSettings,
  getClinicHoursDisplay,
  saveClinicSettings,
} from "@/lib/clinic-settings-store";
import type { ClinicOperatingSettings } from "@/lib/clinic-settings";
import { generateTimeSlots, mergeClinicSettings } from "@/lib/clinic-settings";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const [settings, hours] = await Promise.all([
    getClinicSettings(),
    getClinicHoursDisplay(),
  ]);

  return NextResponse.json({ settings, hours });
}

export async function PUT(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  try {
    const body = (await request.json()) as Partial<ClinicOperatingSettings>;
    const current = await getClinicSettings();

    const next = mergeClinicSettings({
      ...current,
      openTime: body.openTime?.trim() || current.openTime,
      closeTime: body.closeTime?.trim() || current.closeTime,
      slotIntervalMinutes: body.slotIntervalMinutes ?? current.slotIntervalMinutes,
      lunchStart: body.lunchStart === undefined ? current.lunchStart : body.lunchStart,
      lunchEnd: body.lunchEnd === undefined ? current.lunchEnd : body.lunchEnd,
      operatingDays: Array.isArray(body.operatingDays)
        ? body.operatingDays.filter((day) => day >= 0 && day <= 6)
        : current.operatingDays,
      updatedAt: new Date().toISOString(),
    });

    if (toMinutes(next.closeTime) <= toMinutes(next.openTime)) {
      return NextResponse.json(
        { error: "Closing time must be after opening time." },
        { status: 400 }
      );
    }

    const slots = generateTimeSlots(next);
    if (slots.length === 0) {
      return NextResponse.json(
        { error: "These hours do not produce any bookable time slots." },
        { status: 400 }
      );
    }

    if (next.operatingDays.length === 0) {
      return NextResponse.json(
        { error: "Select at least one operating day." },
        { status: 400 }
      );
    }

    await saveClinicSettings(next);
    const hours = await getClinicHoursDisplay();

    return NextResponse.json({ success: true, settings: next, hours });
  } catch {
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}

function toMinutes(time: string): number {
  const [timePart, period] = time.trim().split(/\s+/);
  const [rawHours, rawMinutes] = timePart.split(":").map(Number);
  let hours = rawHours;
  const minutes = rawMinutes ?? 0;
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}
