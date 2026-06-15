import { NextResponse } from "next/server";
import { processAppointmentReminders } from "@/lib/booking-reminders";
import { getSiteUrlFromRequest } from "@/lib/site-url";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const siteUrl = getSiteUrlFromRequest(request);
  const result = await processAppointmentReminders(siteUrl);

  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
