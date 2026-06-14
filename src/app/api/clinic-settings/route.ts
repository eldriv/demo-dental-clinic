import { NextResponse } from "next/server";
import { getClinicSettings, getClinicHoursDisplay } from "@/lib/clinic-settings-store";

export async function GET() {
  const [settings, hours] = await Promise.all([
    getClinicSettings(),
    getClinicHoursDisplay(),
  ]);

  return NextResponse.json({
    settings,
    hours,
  });
}
